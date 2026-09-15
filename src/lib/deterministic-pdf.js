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

    HABILIDADESTECNICAS: 'skills',
    HABILIDADES: 'skills',
    COMPETENCIAS: 'skills',
    SKILLS: 'skills',
    TECHNICALSKILLS: 'skills',
    TECNOLOGIAS: 'skills',

    IDIOMAS: 'languages',
    LANGUAGES: 'languages',

    PROJETOS: 'projects',
    PROJECTS: 'projects',

    CERTIFICACOES: 'certifications',
    CERTIFICADOS: 'certifications',
    CURSOS: 'certifications',
    CERTIFICATIONS: 'certifications',
    COURSES: 'certifications',
};

const MONTHS = '(?:Jan(?:eiro)?|Fev(?:ereiro)?|Mar(?:ço)?|Abr(?:il)?|Mai(?:o)?|Jun(?:ho)?|Jul(?:ho)?|Ago(?:sto)?|Set(?:embro)?|Out(?:ubro)?|Nov(?:embro)?|Dez(?:embro)?)';
const SINGLE_DATE = `(?:${MONTHS}\\s+\\d{4}|\\d{1,2}\\/\\d{2,4}|\\d{4}|${MONTHS})`;
const PERIOD_REGEX = new RegExp(`\\b(${SINGLE_DATE}\\s*(?:[–—-]|a|at[ée])\\s*(?:Atual|Presente|Present|${SINGLE_DATE}))\\b`, 'i');

/**
 * Extracts structured CV data from a PDF file deterministically, preserving
 * the exact words, structure, and blue hyperlinks without any AI intervention.
 * 
 * @param {File} file - PDF file uploaded by the user
 * @returns {Promise<{ profile: object, generatedCV: object }>}
 */
export async function extractDeterministicCVFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const allLines = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const annotations = await page.getAnnotations({ intent: 'display' });
        const links = annotations.filter(a => a.subtype === 'Link' && (a.url || a.dest));

        const textContent = await page.getTextContent();
        const rawItems = textContent.items.filter(it => it.str && it.str.length > 0);

        // Map text items to overlapping link annotations
        const items = rawItems.map(it => {
            const x = it.transform[4];
            const y = it.transform[5];
            const w = it.width || 0;
            const h = Math.abs(it.height || it.transform[3] || 10);

            let linkUrl = null;
            for (const l of links) {
                if (!l.rect) continue;
                const [lx1, ly1, lx2, ly2] = l.rect;
                const xMin = Math.min(lx1, lx2);
                const xMax = Math.max(lx1, lx2);
                const yMin = Math.min(ly1, ly2);
                const yMax = Math.max(ly1, ly2);

                // Check overlap with 1.5px tolerance
                if (x + w >= xMin - 1.5 && x <= xMax + 1.5 && y + h >= yMin - 1.5 && y <= yMax + 1.5) {
                    linkUrl = l.url;
                    break;
                }
            }

            return {
                str: it.str,
                x,
                y,
                w,
                h,
                font: it.fontName,
                linkUrl
            };
        });

        // Sort items by Y descending (top to bottom), then X ascending (left to right)
        items.sort((a, b) => {
            const yDiff = b.y - a.y;
            if (Math.abs(yDiff) > 3) return yDiff;
            return a.x - b.x;
        });

        // Group into lines by Y coordinate
        let curLine = null;
        for (const it of items) {
            if (!curLine || Math.abs(curLine.y - it.y) > 3) {
                curLine = { page: pageNum, y: it.y, items: [it] };
                allLines.push(curLine);
            } else {
                curLine.items.push(it);
            }
        }
    }

    // Convert raw lines into structured text and HTML (with blue hyperlinks)
    const lines = allLines.map(line => {
        let lineHtml = '';
        let lineText = '';

        for (let i = 0; i < line.items.length; i++) {
            const it = line.items[i];
            if (i > 0) {
                const prev = line.items[i - 1];
                if (it.x - (prev.x + prev.w) > 2.5 && !prev.str.endsWith(' ') && !it.str.startsWith(' ')) {
                    lineHtml += ' ';
                    lineText += ' ';
                }
            }

            let itStr = it.str;
            let itUrl = it.linkUrl;

            // Detect URLs/emails in string if no annotation matched
            if (!itUrl) {
                const urlMatch = itStr.match(/(https?:\/\/[^\s]+|linkedin\.com\/in\/[^\s]+|github\.com\/[^\s]+)/i);
                if (urlMatch) {
                    itUrl = urlMatch[0].startsWith('http') ? urlMatch[0] : 'https://' + urlMatch[0];
                } else if (itStr.includes('@') && !itStr.includes(' ')) {
                    const emailMatch = itStr.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                    if (emailMatch) itUrl = 'mailto:' + emailMatch[0];
                }
            }

            if (itUrl) {
                lineHtml += `<a href="${itUrl}" target="_blank" style="color: #0066cc; text-decoration: none;">${itStr}</a>`;
            } else {
                lineHtml += itStr;
            }
            lineText += itStr;
        }

        return {
            page: line.page,
            y: line.y,
            text: lineText.trim(),
            html: lineHtml.trim(),
            key: cleanHeadingKey(lineText)
        };
    }).filter(l => l.text.length > 0);

    if (lines.length === 0) {
        throw new Error('Não foi possível extrair texto do arquivo PDF.');
    }

    // 1. Candidate Name (first line, usually largest font)
    const nameLine = lines[0];
    const candidateName = nameLine.text;

    // 2. Parse Contact Info & Links from header area (lines before first section)
    const contact = {
        location: '',
        phone: '',
        email: '',
        linkedin: '',
        github: '',
        portfolio: ''
    };

    let firstSectionIndex = lines.findIndex((l, idx) => idx > 0 && SECTION_KEY_MAP[l.key]);
    if (firstSectionIndex === -1) firstSectionIndex = Math.min(4, lines.length);

    const headerLines = lines.slice(1, firstSectionIndex);

    // Extract links and contact fields from header lines
    for (const hl of headerLines) {
        // Email
        const emailMatch = hl.text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch && !contact.email) contact.email = emailMatch[0];

        // Phone
        const phoneMatch = hl.text.match(/(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4,5}[-\s]?\d{4}/);
        if (phoneMatch && !contact.phone) contact.phone = phoneMatch[0].trim();

        // Location (e.g. "São José de Ribamar, MA" or "Cidade, Estado")
        const locMatch = hl.text.match(/([A-ZÀ-Úa-zà-ú\s]+,\s*[A-Z]{2})/);
        if (locMatch && !contact.location) contact.location = locMatch[1].trim();

        // Check for links inside line items / HTML
        const hrefMatches = hl.html.matchAll(/href="([^"]+)"/g);
        for (const hm of hrefMatches) {
            const url = hm[1];
            if (url.includes('linkedin.com')) contact.linkedin = url;
            else if (url.includes('github.com')) contact.github = url;
            else if (!url.startsWith('mailto:') && !url.startsWith('tel:') && !contact.portfolio) {
                contact.portfolio = url;
            }
        }

        // Fallback text check for URLs
        if (!contact.linkedin) {
            const li = hl.text.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
            if (li) contact.linkedin = 'https://' + li[0];
        }
        if (!contact.github) {
            const gh = hl.text.match(/github\.com\/[a-zA-Z0-9_-]+/i);
            if (gh) contact.github = 'https://' + gh[0];
        }
        if (!contact.portfolio) {
            const port = hl.text.match(/(https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s|]*|[a-zA-Z0-9-]+\.dev[^\s|]*)/i);
            if (port && !port[0].includes('linkedin') && !port[0].includes('github')) {
                contact.portfolio = port[0].startsWith('http') ? port[0] : 'https://' + port[0];
            }
        }
    }

    // 3. Partition lines into sections
    const sections = [];
    let currentSection = null;

    for (let i = firstSectionIndex; i < lines.length; i++) {
        const l = lines[i];
        const secType = SECTION_KEY_MAP[l.key];

        if (secType) {
            currentSection = {
                type: secType,
                title: l.text,
                lines: []
            };
            sections.push(currentSection);
        } else if (currentSection) {
            currentSection.lines.push(l);
        }
    }

    // 4. Parse each section deterministically
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
            // Group experiences: each starts with a company/header line, then title, then bullets
            let curExp = null;

            for (let i = 0; i < sec.lines.length; i++) {
                const line = sec.lines[i];
                const isBullet = /^[•\-\*◦▪]/.test(line.text.trim());

                if (isBullet) {
                    if (!curExp) {
                        curExp = { company: '', title: '', period: '', bullets: [] };
                        experiences.push(curExp);
                    }
                    const cleanBullet = line.text.replace(/^[•\-\*◦▪]\s*/, '').trim();
                    curExp.bullets.push(cleanBullet);
                } else {
                    // Check if this line looks like a continuation of the previous bullet
                    if (curExp && curExp.bullets.length > 0 && !PERIOD_REGEX.test(line.text) && line.text.length < 80 && i > 0 && /^[•\-\*◦▪]/.test(sec.lines[i - 1].text.trim())) {
                        // Could be wrapped line of bullet or new header
                        if (/^[a-zà-ú]/.test(line.text.trim()) || line.text.endsWith('.')) {
                            curExp.bullets[curExp.bullets.length - 1] += ' ' + line.text.trim();
                            continue;
                        }
                    }

                    // Check if it's a new company/period header
                    const periodMatch = line.text.match(PERIOD_REGEX);
                    if (periodMatch || !curExp || curExp.bullets.length > 0) {
                        let company = line.text;
                        let period = '';
                        if (periodMatch) {
                            period = periodMatch[0].trim();
                            company = line.text.replace(periodMatch[0], '').replace(/[—–-]\s*$/, '').trim();
                        }

                        // Next line might be the role/title
                        let roleTitle = '';
                        if (i + 1 < sec.lines.length && !/^[•\-\*◦▪]/.test(sec.lines[i + 1].text.trim())) {
                            roleTitle = sec.lines[i + 1].text.trim();
                            i++; // advance past role line
                        }

                        curExp = {
                            company,
                            title: roleTitle,
                            period,
                            bullets: []
                        };
                        experiences.push(curExp);
                    } else if (curExp && !curExp.title) {
                        curExp.title = line.text.trim();
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
                if (i + 1 < sec.lines.length) {
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
            const combined = sec.lines.map(l => l.text).join(', ');
            skills = combined
                .split(/[,•|;]\s*/)
                .map(s => s.trim())
                .filter(s => s.length > 1);
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
                const titleMatch = clean.match(/^([^:(—]+)(?:\s*[:(—]\s*(Desenvolvedor|Líder|Criador|Dev)?[^)]*\)?\s*)?:?\s*(.*)$/i);
                if (titleMatch && titleMatch[3]) {
                    projects.push({
                        title: titleMatch[1].trim(),
                        role: titleMatch[2] ? titleMatch[2].trim() : 'Desenvolvedor',
                        description: titleMatch[3].trim()
                    });
                } else if (curProj) {
                    curProj.description += ' ' + clean;
                } else {
                    curProj = { title: clean, role: 'Desenvolvedor', description: '' };
                    projects.push(curProj);
                }
            }
        }
    }

    // Check if there was an explicit title line in the header (e.g. between Name and Contact info)
    let explicitTitle = '';
    for (const hl of headerLines) {
        const hasEmail = /@/.test(hl.text);
        const hasPhone = /\d{4,}/.test(hl.text);
        const hasUrl = /https?:\/\/|linkedin\.com|github\.com/i.test(hl.text);
        const isSeparatedContact = hl.text.includes('|');
        if (!hasEmail && !hasPhone && !hasUrl && !isSeparatedContact && hl.text.length < 80) {
            explicitTitle = hl.text.trim();
            break;
        }
    }
    const candidateTitle = explicitTitle;

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
        projects
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
