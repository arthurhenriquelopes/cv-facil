import * as pdfjsLib from 'pdfjs-dist';

// Configure the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).href;

/**
 * Normalizes heading strings to a clean uppercase key without accents or spacing.
 * Handles letter-spaced headings like "R E S U M O   P R O F I S S I O N A L".
 */
function cleanHeadingKey(str) {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z]/g, '')
        .toUpperCase();
}

/**
 * Map of normalized section keys to canonical section names.
 */
const SECTION_KEY_MAP = {
    RESUMOPROFISSIONAL: 'summary',
    RESUMO: 'summary',
    PERFIL: 'summary',
    PERFILPROFISSIONAL: 'summary',
    SOBRE: 'summary',
    SUMMARY: 'summary',
    PROFILE: 'summary',
    ABOUT: 'summary',

    EXPERIENCIAPROFISSIONAL: 'experience',
    EXPERIENCIA: 'experience',
    HISTORICOPROFISSIONAL: 'experience',
    ATUACAOPROFISSIONAL: 'experience',
    EXPERIENCIAS: 'experience',
    EXPERIENCE: 'experience',
    WORKEXPERIENCE: 'experience',

    FORMACAOACADEMICA: 'education',
    FORMACAO: 'education',
    EDUCACAO: 'education',
    ACADEMICA: 'education',
    EDUCATION: 'education',

    HABILIDADES: 'skills',
    HABILIDADESTECNICAS: 'skills',
    COMPETENCIAS: 'skills',
    SKILLS: 'skills',
    TECHNICALSKILLS: 'skills',
    TECNOLOGIAS: 'skills',

    IDIOMAS: 'languages',
    LANGUAGES: 'languages',

    PROJETOS: 'projects',
    PROJETOSDESTACADOS: 'projects',
    PROJECTS: 'projects',

    CERTIFICACOES: 'certifications',
    CERTIFICADOS: 'certifications',
    CURSOS: 'certifications',
    CERTIFICATIONS: 'certifications',
    COURSES: 'certifications',
};

const MONTHS = '(?:Jan(?:eiro)?|Fev(?:ereiro)?|Mar(?:ço)?|Abr(?:il)?|Mai(?:o)?|Jun(?:ho)?|Jul(?:ho)?|Ago(?:sto)?|Set(?:embro)?|Out(?:ubro)?|Nov(?:embro)?|Dez(?:embro)?)';
const SINGLE_DATE = `(?:${MONTHS}\\\\s+\\\\d{4}|\\\\d{1,2}\\\\/\\\\d{2,4}|\\\\d{4}|${MONTHS})`;
const PERIOD_REGEX = new RegExp(`\\\\b(${SINGLE_DATE}\\\\s*(?:[–—-]|a|at[ée])\\\\s*(?:Atual|Presente|Present|${SINGLE_DATE}))\\\\b`, 'i');

// ─── Font style detection ──────────────────────────────────────────────────────

/**
 * Detect if a fontName indicates bold weight.
 */
function isFontBold(fontName) {
    if (!fontName) return false;
    return /bold|bd|heavy|black|demi|semibold/i.test(fontName);
}

/**
 * Detect if a fontName indicates italic style.
 */
function isFontItalic(fontName) {
    if (!fontName) return false;
    return /italic|it|oblique/i.test(fontName);
}

/**
 * Extract font size from a textItem's transform matrix.
 * transform = [scaleX, skewX, skewY, scaleY, translateX, translateY]
 * Font size is typically abs(transform[0]) or abs(transform[3]).
 */
function getFontSize(item) {
    const sx = Math.abs(item.transform[0]);
    const sy = Math.abs(item.transform[3]);
    // Use whichever is larger — some PDFs use rotation where one axis is 0
    return Math.max(sx, sy);
}

/**
 * Compute the statistical mode (most frequent value) from an array of numbers,
 * rounding to 0.5pt precision.
 */
function computeMode(values) {
    if (values.length === 0) return 10;
    const freq = {};
    for (const v of values) {
        const key = (Math.round(v * 2) / 2).toFixed(1); // round to 0.5pt
        freq[key] = (freq[key] || 0) + 1;
    }
    let maxCount = 0;
    let modeVal = 10;
    for (const [key, count] of Object.entries(freq)) {
        if (count > maxCount) {
            maxCount = count;
            modeVal = parseFloat(key);
        }
    }
    return modeVal;
}

// ─── HR detection via operator list ────────────────────────────────────────────

/**
 * Detect horizontal rules from the page's operator list.
 * Returns an array of Y positions (in PDF coords, top = higher Y) where HRs appear.
 */
async function detectHorizontalRules(page) {
    const ops = await page.getOperatorList();
    const viewport = page.getViewport({ scale: 1 });
    const pageWidth = viewport.width;
    const hrYPositions = [];

    for (let i = 0; i < ops.fnArray.length; i++) {
        // constructPath contains sub-operations
        if (ops.fnArray[i] === pdfjsLib.OPS.constructPath) {
            const args = ops.argsArray[i];
            const subOps = args[0]; // array of sub-operation codes
            const subArgs = args[1]; // flat array of numeric arguments

            let argIdx = 0;
            for (const op of subOps) {
                if (op === pdfjsLib.OPS.rectangle) {
                    // rect(x, y, w, h)
                    const x = subArgs[argIdx];
                    const y = subArgs[argIdx + 1];
                    const w = subArgs[argIdx + 2];
                    const h = subArgs[argIdx + 3];
                    argIdx += 4;

                    // Thin rectangle spanning significant width = horizontal rule
                    if (Math.abs(h) <= 3 && w > pageWidth * 0.3) {
                        hrYPositions.push(y);
                    }
                } else if (op === pdfjsLib.OPS.moveTo) {
                    argIdx += 2;
                } else if (op === pdfjsLib.OPS.lineTo) {
                    argIdx += 2;
                } else if (op === pdfjsLib.OPS.curveTo || op === pdfjsLib.OPS.curveTo2 || op === pdfjsLib.OPS.curveTo3) {
                    argIdx += 6;
                } else {
                    // closePath etc — no args
                }
            }
        }
        // Also check for stroke paths that form lines
        if (ops.fnArray[i] === pdfjsLib.OPS.constructPath) {
            const args = ops.argsArray[i];
            const subOps = args[0];
            const subArgs = args[1];

            if (subOps.length === 2 &&
                subOps[0] === pdfjsLib.OPS.moveTo &&
                subOps[1] === pdfjsLib.OPS.lineTo) {
                const x1 = subArgs[0], y1 = subArgs[1];
                const x2 = subArgs[2], y2 = subArgs[3];
                // Horizontal line (same Y, significant width)
                if (Math.abs(y1 - y2) < 1 && Math.abs(x2 - x1) > pageWidth * 0.3) {
                    hrYPositions.push(y1);
                }
            }
        }
    }

    return hrYPositions;
}

/**
 * Extracts structured CV data from a PDF file deterministically, preserving
 * the exact words, structure, blue hyperlinks, AND original font sizes/styles
 * without any AI intervention.
 * 
 * @param {File} file - PDF file uploaded by the user
 * @returns {Promise<{ profile: object, generatedCV: object }>}
 */
export async function extractDeterministicCVFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const allLines = [];
    const allFontSizes = []; // collect all body font sizes for mode calculation
    const contact = {
        location: '',
        phone: '',
        email: '',
        linkedin: '',
        github: '',
        portfolio: ''
    };

    let hrAfterSectionTitle = false; // whether HRs appear after section titles

    // 1. First pass: extract all link annotations + text with font metadata
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const annotations = await page.getAnnotations({ intent: 'display' });

        for (const a of annotations) {
            if (a.subtype === 'Link' && a.url) {
                const u = a.url.trim();
                if (u.includes('linkedin.com')) {
                    contact.linkedin = u;
                } else if (u.includes('github.com')) {
                    contact.github = u;
                } else if (u.startsWith('mailto:')) {
                    contact.email = u.replace(/^mailto:/i, '').replace(/%40/g, '@').trim();
                } else if (u.startsWith('tel:')) {
                    contact.phone = u.replace(/^tel:/i, '').trim();
                } else if (!contact.portfolio && (u.startsWith('http://') || u.startsWith('https://'))) {
                    contact.portfolio = u;
                }
            }
        }

        // Detect horizontal rules on this page
        const hrYPositions = await detectHorizontalRules(page);

        // Extract text items with font metadata
        const textContent = await page.getTextContent();
        const rawItems = textContent.items.filter(it => it.str && it.str.length > 0);

        // Sort items by Y descending (top to bottom), then X ascending (left to right)
        rawItems.sort((a, b) => {
            const yDiff = b.transform[5] - a.transform[5];
            if (Math.abs(yDiff) > 3) return yDiff;
            return a.transform[4] - b.transform[4];
        });

        // Group into lines by Y coordinate, capturing font metadata
        let curLine = null;
        for (const it of rawItems) {
            const y = Math.round(it.transform[5]);
            const str = it.str;
            const fontSize = getFontSize(it);
            const bold = isFontBold(it.fontName);
            const italic = isFontItalic(it.fontName);

            if (!curLine || Math.abs(curLine.y - y) > 3) {
                curLine = {
                    page: pageNum,
                    y,
                    items: [it],
                    text: str,
                    fontSize,       // dominant font size of the line (from first item)
                    fontSizes: [fontSize],
                    isBold: bold,
                    isItalic: italic,
                    // Check if there's a HR just above this line (within 5pt)
                    hasHrAbove: hrYPositions.some(hrY => Math.abs(hrY - y) < 15 && hrY >= y)
                };
                allLines.push(curLine);
            } else {
                curLine.items.push(it);
                curLine.fontSizes.push(fontSize);
                // Line is bold only if ALL items are bold
                curLine.isBold = curLine.isBold && bold;
                // Line is italic if ANY item is italic
                curLine.isItalic = curLine.isItalic || italic;

                const prev = curLine.items[curLine.items.length - 2];
                const needSpace = it.transform[4] - (prev.transform[4] + (prev.width || 0)) > 2 && !curLine.text.endsWith(' ') && !str.startsWith(' ');
                curLine.text += (needSpace ? ' ' : '') + str;
            }
        }
    }

    // Finalize line font sizes: use the mode (most common) size per line
    for (const line of allLines) {
        line.fontSize = computeMode(line.fontSizes);
    }

    const lines = allLines.map(l => ({
        page: l.page,
        y: l.y,
        text: l.text.trim(),
        key: cleanHeadingKey(l.text),
        fontSize: l.fontSize,
        isBold: l.isBold,
        isItalic: l.isItalic,
        hasHrAbove: l.hasHrAbove
    })).filter(l => l.text.length > 0);

    if (lines.length === 0) {
        throw new Error('Não foi possível extrair texto do arquivo PDF.');
    }

    // ─── Compute styling metrics ───────────────────────────────────────────────

    // Name = first line
    const candidateName = lines[0].text;
    const nameSize = lines[0].fontSize;

    // 3. Header analysis (lines between Name and the first section title)
    let firstSectionIndex = lines.findIndex((l, idx) => idx > 0 && SECTION_KEY_MAP[l.key]);
    if (firstSectionIndex === -1) firstSectionIndex = Math.min(6, lines.length);

    const headerLines = lines.slice(1, firstSectionIndex);
    let candidateTitle = '';
    let titleSize = 0;
    let contactSize = 0;

    for (const hl of headerLines) {
        const text = hl.text;

        // Email check
        const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch && !contact.email) {
            contact.email = emailMatch[0];
        }

        // Phone check
        const phoneMatch = text.match(/(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4,5}[-\s]?\d{4}/);
        if (phoneMatch && !contact.phone) {
            contact.phone = phoneMatch[0].trim();
        }

        // URL check
        if (!contact.linkedin) {
            const li = text.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
            if (li) contact.linkedin = 'https://' + li[0];
        }
        if (!contact.github) {
            const gh = text.match(/github\.com\/[a-zA-Z0-9_-]+/i);
            if (gh) contact.github = 'https://' + gh[0];
        }
        if (!contact.portfolio) {
            const port = text.match(/(https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s|]*|[a-zA-Z0-9-]+\.dev[^\s|]*)/i);
            if (port && !port[0].includes('linkedin') && !port[0].includes('github')) {
                contact.portfolio = port[0].startsWith('http') ? port[0] : 'https://' + port[0];
            }
        }

        // Social line check (e.g. "LinkedIn | GitHub | Portfólio")
        const isSocialLine = /LinkedIn|GitHub|Portf[oó]lio/i.test(text);

        // Phone/Email line check
        const isContactLine = /@|\(?\d{2}\)?\s*\d{4,5}/.test(text);

        // Location line check
        const isLocationLine = /[A-Za-zÀ-ÿ\s]+,\s*[A-Za-zÀ-ÿ\s]{2,}/.test(text) &&
            !/Desenvolvedor|Engenheiro|Developer|Software|Analista|Junior|Pleno|Senior|Foco|Estudante/i.test(text);

        if (isLocationLine && !contact.location) {
            const locMatch = text.match(/([A-ZÀ-Úa-zà-ú\s]+,\s*[A-Za-zÀ-ÿ]{2,})/);
            contact.location = locMatch ? locMatch[1].trim() : text.trim();
            if (!contactSize) contactSize = hl.fontSize;
        } else if (isSocialLine || isContactLine) {
            if (!contactSize) contactSize = hl.fontSize;
        } else if (!isSocialLine && !isContactLine && !isLocationLine && !candidateTitle) {
            // It's the professional title/headline!
            candidateTitle = text.trim();
            titleSize = hl.fontSize;
        }
    }

    // 4. Partition document lines into sections
    const sections = [];
    let currentSection = null;
    const sectionHeadingSizes = [];

    for (let i = firstSectionIndex; i < lines.length; i++) {
        const l = lines[i];
        const secType = SECTION_KEY_MAP[l.key];

        if (secType) {
            sectionHeadingSizes.push(l.fontSize);
            // Check if this section heading has an HR
            if (l.hasHrAbove) hrAfterSectionTitle = true;
            currentSection = {
                type: secType,
                title: l.text,
                titleBold: l.isBold,
                titleUppercase: l.text === l.text.toUpperCase(),
                hasHr: l.hasHrAbove,
                lines: []
            };
            sections.push(currentSection);
        } else if (currentSection) {
            currentSection.lines.push(l);
            // Collect body font sizes (non-heading text)
            allFontSizes.push(l.fontSize);
        }
    }

    // Compute styling object
    const bodySize = computeMode(allFontSizes);
    const sectionSize = sectionHeadingSizes.length > 0 ? computeMode(sectionHeadingSizes) : bodySize;

    // Detect if section titles use border-bottom (HR under section titles)
    // Check if at least half of sections have HRs
    const sectionsWithHr = sections.filter(s => s.hasHr).length;
    const sectionHrDetected = sectionsWithHr > sections.length * 0.3;

    const styling = {
        nameSize: Math.round(nameSize * 2) / 2,        // round to 0.5pt
        titleSize: Math.round((titleSize || bodySize) * 2) / 2,
        sectionSize: Math.round(sectionSize * 2) / 2,
        bodySize: Math.round(bodySize * 2) / 2,
        contactSize: Math.round((contactSize || bodySize * 0.85) * 2) / 2,
        sectionTitleBold: sections.length > 0 ? sections[0].titleBold : true,
        sectionTitleUppercase: sections.length > 0 ? sections[0].titleUppercase : true,
        sectionHasHr: sectionHrDetected,
    };

    // 5. Parse each section deterministically
    let summaryText = '';
    const experiences = [];
    const education = [];
    let skills = [];
    const languages = [];
    const certifications = [];
    const projects = [];

    for (const sec of sections) {
        if (sec.type === 'summary') {
            summaryText = sec.lines.map(l => l.text).join(' ').trim();
        } else if (sec.type === 'experience') {
            let curExp = null;

            for (let i = 0; i < sec.lines.length; i++) {
                const line = sec.lines[i];
                const cleanText = line.text.trim();
                const isBullet = /^[•\-\*◦▪]/.test(cleanText);

                if (isBullet) {
                    if (!curExp) {
                        curExp = { company: '', title: '', period: '', bullets: [] };
                        experiences.push(curExp);
                    }
                    const cleanBullet = cleanText.replace(/^[•\-\*◦▪]\s*/, '').trim();
                    curExp.bullets.push(cleanBullet);
                } else {
                    const periodMatch = cleanText.match(PERIOD_REGEX);
                    if (periodMatch) {
                        let period = periodMatch[0].trim();
                        let company = cleanText.replace(periodMatch[0], '').replace(/[—–-]\s*$/, '').trim();

                        // Next line might be the role/title
                        let roleTitle = '';
                        if (i + 1 < sec.lines.length &&
                            !/^[•\-\*◦▪]/.test(sec.lines[i + 1].text.trim()) &&
                            !sec.lines[i + 1].text.match(PERIOD_REGEX)) {
                            roleTitle = sec.lines[i + 1].text.trim();
                            i++;
                        }

                        curExp = {
                            company,
                            title: roleTitle,
                            period,
                            bullets: []
                        };
                        experiences.push(curExp);
                    } else if (curExp && curExp.bullets.length > 0) {
                        // Continuation of previous bullet point!
                        curExp.bullets[curExp.bullets.length - 1] += ' ' + cleanText;
                    } else if (curExp && !curExp.title) {
                        curExp.title = cleanText;
                    } else {
                        curExp = { company: cleanText, title: '', period: '', bullets: [] };
                        experiences.push(curExp);
                    }
                }
            }
        } else if (sec.type === 'education') {
            for (let i = 0; i < sec.lines.length; i++) {
                const line = sec.lines[i];
                const periodMatch = line.text.match(PERIOD_REGEX);
                let inst = line.text;
                let period = '';
                if (periodMatch) {
                    period = periodMatch[0].trim();
                    inst = line.text.replace(periodMatch[0], '').replace(/[—–-]\s*$/, '').trim();
                }

                let degree = '';
                if (i + 1 < sec.lines.length && !sec.lines[i + 1].text.match(PERIOD_REGEX)) {
                    degree = sec.lines[i + 1].text.trim();
                    i++;
                }

                education.push({
                    institution: inst,
                    degree: degree || 'Graduação',
                    period
                });
            }
        } else if (sec.type === 'skills') {
            const categories = [];
            let currentCat = null;
            const flatSkills = [];

            for (const line of sec.lines) {
                const text = line.text.trim();
                const catMatch = text.match(/^([A-Za-zÀ-ÿ0-9\s/&+-]+):\s*(.*)$/);
                if (catMatch) {
                    currentCat = {
                        label: catMatch[1].trim(),
                        items: catMatch[2]
                            .split(/[,;]\s*/)
                            .map(s => s.replace(/\.$/, '').trim())
                            .filter(Boolean)
                    };
                    categories.push(currentCat);
                } else if (currentCat) {
                    const moreItems = text
                        .split(/[,;]\s*/)
                        .map(s => s.replace(/\.$/, '').trim())
                        .filter(Boolean);
                    currentCat.items.push(...moreItems);
                } else {
                    const items = text
                        .split(/[,;]\s*/)
                        .map(s => s.replace(/\.$/, '').trim())
                        .filter(Boolean);
                    flatSkills.push(...items);
                }
            }

            if (categories.length > 0) {
                skills = {
                    categorized: true,
                    categories
                };
            } else {
                skills = flatSkills;
            }
        } else if (sec.type === 'languages') {
            for (const line of sec.lines) {
                const clean = line.text.replace(/^[•\-\*◦▪]\s*/, '').trim();
                const parts = clean.split(/[:—–-]\s*/);
                if (parts.length >= 2) {
                    languages.push({ name: parts[0].trim(), level: parts[1].trim() });
                } else if (clean.length > 0) {
                    languages.push({ name: clean, level: 'Intermediário' });
                }
            }
        } else if (sec.type === 'certifications') {
            for (const line of sec.lines) {
                const clean = line.text.replace(/^[•\-\*◦▪]\s*/, '').trim();
                if (clean.length === 0) continue;

                let year = '';
                const yearMatch = clean.match(/\b(19|20)\d{2}\b/);
                if (yearMatch) year = yearMatch[0];

                let inst = '';
                const instMatch = clean.match(/\(([^)]+)\)/);
                if (instMatch) {
                    const inner = instMatch[1];
                    const parts = inner.split(/,\s*/);
                    inst = parts[0];
                    if (parts[1] && /\b(19|20)\d{2}\b/.test(parts[1])) year = parts[1];
                }

                certifications.push({
                    name: clean.replace(/\s*\([^)]*\)\s*$/, '').trim(),
                    title: clean.replace(/\s*\([^)]*\)\s*$/, '').trim(),
                    institution: inst,
                    issuer: inst,
                    year: year || '2026',
                    date: year || '2026'
                });
            }
        } else if (sec.type === 'projects') {
            let curProj = null;
            for (const line of sec.lines) {
                const clean = line.text.replace(/^[•\-\*◦▪]\s*/, '').trim();
                // Match "Title — Role" or "Title - Role" or "Title: Role"
                const titleMatch = clean.match(/^([^\n—–-]+)\s*[—–-]\s*([^\n]+)$/);
                if (titleMatch && !curProj?.description) {
                    curProj = {
                        title: titleMatch[1].trim(),
                        role: titleMatch[2].trim(),
                        description: ''
                    };
                    projects.push(curProj);
                } else if (titleMatch && curProj) {
                    curProj = {
                        title: titleMatch[1].trim(),
                        role: titleMatch[2].trim(),
                        description: ''
                    };
                    projects.push(curProj);
                } else if (curProj) {
                    curProj.description += (curProj.description ? ' ' : '') + clean;
                } else {
                    curProj = { title: clean, role: 'Desenvolvedor', description: '' };
                    projects.push(curProj);
                }
            }
        }
    }

    const generatedCV = {
        header: {
            name: candidateName,
            title: candidateTitle,
            contact
        },
        summary: summaryText,
        experiences,
        education,
        skills,
        languages,
        certifications,
        projects,
        styling  // <-- NEW: extracted font sizes and style metadata
    };

    const profile = {
        name: candidateName,
        title: candidateTitle,
        email: contact.email,
        phone: contact.phone,
        location: contact.location,
        linkedin: contact.linkedin,
        github: contact.github,
        portfolio: contact.portfolio,
        summary: summaryText,
        experiences: experiences.map(e => ({
            company: e.company,
            title: e.title,
            startDate: e.period.split(/[–—-]/)[0]?.trim() || '',
            endDate: e.period.split(/[–—-]/)[1]?.trim() || '',
            isCurrent: /Atual|Present/i.test(e.period),
            description: (e.bullets || []).map(b => '• ' + b).join('\n')
        })),
        education: education.map(edu => ({
            institution: edu.institution,
            degree: edu.degree,
            startDate: edu.period.split(/[–—-]/)[0]?.trim() || '',
            endDate: edu.period.split(/[–—-]/)[1]?.trim() || '',
        })),
        skills,
        languages,
        certifications,
        projects
    };

    return { profile, generatedCV };
}
