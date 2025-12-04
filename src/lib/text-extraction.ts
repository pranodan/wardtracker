export interface ExtractedData {
    name?: string;
    ageGender?: string;
    diagnosis?: string;
    procedure?: string;
    bedNo?: string;
}

export function parseClinicalText(text: string): ExtractedData {
    const data: ExtractedData = {};
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // Helper to find line starting with specific prefix
    const findLine = (prefixes: string[]) => {
        for (const line of lines) {
            for (const prefix of prefixes) {
                if (line.toLowerCase().startsWith(prefix.toLowerCase())) {
                    return line.substring(prefix.length).trim();
                }
            }
        }
        return undefined;
    };

    // 1. Extract Diagnosis (Dx)
    data.diagnosis = findLine(['Dx:', 'Dx-', 'Diagnosis:']);

    // 2. Extract Procedure (Tx, T/T, or narrative)
    data.procedure = findLine(['Tx:', 'Tx-', 'T/T', 'Treatment:', 'Procedure:']);

    // 3. Narrative extraction (e.g., "Name underwent Procedure for Diagnosis")
    if (!data.diagnosis || !data.procedure) {
        const underwentLine = lines.find(l => l.toLowerCase().includes('underwent'));
        if (underwentLine) {
            const parts = underwentLine.split(/underwent/i);
            if (parts[0]) {
                // Attempt to extract Name/Age from the part before "underwent"
                // e.g. "48y/m, Bhojraj awasthi"
                const preUnderwent = parts[0].trim();
                // Simple heuristic: split by comma if present
                if (preUnderwent.includes(',')) {
                    const split = preUnderwent.split(',');
                    // Check which part looks like age/gender (digits + y/m or F/M)
                    const ageGenderRegex = /\d+\s*[yY]?\/?[mMfF]/;
                    if (ageGenderRegex.test(split[0])) {
                        data.ageGender = split[0].trim();
                        data.name = split[1].trim();
                    } else {
                        data.name = split[0].trim();
                        data.ageGender = split[1].trim();
                    }
                } else {
                    data.name = preUnderwent;
                }
            }

            if (parts[1]) {
                // "ORIF ... for ... fracture"
                const procedureDiagnosisSplit = parts[1].split(/\s+for\s+/i);
                if (procedureDiagnosisSplit.length > 1) {
                    data.procedure = procedureDiagnosisSplit[0].trim();
                    data.diagnosis = procedureDiagnosisSplit.slice(1).join(' for ').trim();
                } else {
                    data.procedure = parts[1].trim();
                }
            }
        }
    }

    // 4. Name and Age/Gender extraction (if not found in narrative)
    if (!data.name) {
        // Look for lines that look like "Name, Age/Gender" or "Name Age/Gender"
        // Example: "Vesha Devi subedi,60F" or "Tilak Kumari Rai 52/F"
        for (const line of lines) {
            if (line.startsWith('Dx') || line.startsWith('Tx') || line.startsWith('T/T')) continue;

            // Check for Age/Gender pattern at the end or beginning
            // 60F, 52/F, 48y/m
            const ageGenderMatch = line.match(/(\d+\s*[yY]?\/?[mMfF])/);
            if (ageGenderMatch) {
                data.ageGender = ageGenderMatch[0];
                // Assume the rest is the name, removing the match and commas
                data.name = line.replace(ageGenderMatch[0], '').replace(/,/g, '').trim();

                // If name is empty, maybe it's on the other side?
                // But usually "Name, Age" or "Age, Name"
                // Let's rely on the replace for now.
                break;
            }
        }
    }

    // 5. Bed Number (Simple heuristic: Short line at start, e.g., "316-B")
    if (lines[0] && lines[0].length < 10 && /\d/.test(lines[0]) && !data.name) {
        data.bedNo = lines[0];
    }

    return data;
}
