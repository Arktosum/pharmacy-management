# Task: Read Medical Source Files and Add Their Medicines, Diseases, and Relationships to `tips.json`

## 1. Goal

You are given one or more source files and the existing graph file `backend/databases/tips.json`. Your job:

1. Read each source file **completely**.
2. Work out, by understanding the text yourself, which **medicines** it mentions, which **diseases/symptoms** it mentions, and which medicine is recommended for which disease.
3. Normalize the names and check them against the existing graph so nothing is duplicated.
4. Add the new medicines, diseases, and links to `tips.json`.

Don't assume a fixed document layout. Work out the structure from the content. Never invent medical facts. Only record what the source says.

---

## 2. Core principle (overrides every other rule)

**Every medicine and every disease is one unique, single entity.**

- One medicine node = exactly one medicine.
- One illness node = exactly one disease or symptom.
- A list is never one node. If a source line names several medicines or several diseases, create (or reuse) a separate node for each one and link each one separately.
- This applies no matter how the items are joined: commas, semicolons, "and", "or", slashes, bullets, line breaks, table cells, or a run-on sentence.

If you ever find yourself writing a node name that contains a list, stop and split it.

---

## 3. Target file: `backend/databases/tips.json`

Exact schema. Do not change it.

```json
{
  "medicines": [ { "id": "SqpbM1TXUW4sxoNVG6mPN", "name": "Angelica Archangelica" } ],
  "illnesses": [ { "id": "yZ_0kL12mnOPqRstUVwxy", "name": "Bronchial Asthma" } ],
  "links":     [ { "medicineId": "SqpbM1TXUW4sxoNVG6mPN", "diseaseId": "yZ_0kL12mnOPqRstUVwxy" } ]
}
```

Rules:
- Exactly three top-level arrays: `medicines`, `illnesses`, `links`.
- Medicine and illness nodes have only `id` and `name`. Links have only `medicineId` and `diseaseId`. No extra fields.
- IDs are `nanoid()` values (21 characters from `A-Za-z0-9_-`). Every new ID must be checked against all existing IDs (medicines, illnesses, and IDs generated earlier in this run) to rule out collisions.
- **Add-only.** Never edit, rename, reorder, or delete existing nodes or links, and never change an existing ID.

---

## 4. Procedure

### Step 1: Load and validate the current graph
- Parse `tips.json`. Record the starting counts of medicines, illnesses, and links.
- Build lookup tables from normalized name to node ID, separately for medicines and illnesses (normalization is defined in section 7).
- If two existing nodes of the same type share a normalized key, don't change either one. Mention it in the final notes.

### Step 2: Read each source file completely
Read the whole file before extracting anything, so you understand how it is organized. For long files, work through them section by section, and keep a running list so nothing is skipped.

By format:
- **PDF**: Follow the real reading order (finish one column before starting the next). Ignore running headers and footers, page numbers, and chapter titles. Rebuild words broken by line-end hyphenation. If OCR clearly damaged a name (e.g. `Nux Vomlca`), correct it to the intended name.
- **DOCX**: Treat each paragraph, bullet, and table cell as its own unit. Bold text is often a medicine name and italic text is often a symptom, but confirm from context and never rely on formatting alone.
- **XLSX / CSV**: Read every sheet. Treat the first row as headers only if it looks like headers. A value in a merged cell applies to every row it spans. A cell may hold many items, so split them (see section 5).
- **Plain text / Markdown**: Read paragraph by paragraph. Notes and tips often have the medicine and the disease in the same sentence.

### Step 3: Work out each medicine → disease relationship
For each passage, decide who is being recommended for what. Some typical shapes (not an exhaustive list):

| Shape | Example | Result |
| :-- | :-- | :-- |
| Medicine followed by its indications | `Belladonna: high fever, throbbing headache, delirium` | Belladonna → High Fever, Headache, Delirium |
| Disease followed by its medicines | `Migraine: Sanguinaria, Iris Versicolor, Gelsemium` | Sanguinaria, Iris Versicolor, Gelsemium → Migraine |
| Free-text tip | `In otitis media, Chamomilla suits an irritable child; Pulsatilla suits a weepy, clingy one.` | Chamomilla → Otitis Media; Pulsatilla → Otitis Media |
| Comparison tip | `Arnica after trauma; compare Bellis Perennis in deep pelvic contusions, Hypericum when nerves are injured` | Arnica → Trauma; Bellis Perennis → Pelvic Contusion; Hypericum → Nerve Injury |
| Table | Columns like Remedy / Indication | Each row's medicine → each indication in that row |

Rules for relationships:
- Link a medicine to a disease only when the source supports it.
- If one medicine is listed for several diseases, create one link per disease. If several medicines are listed for one disease, create one link per medicine.
- A sentence that gives a condition (e.g. "irritable child") alongside the disease creates a link to the disease only. Don't create a node for the personality or modality description.
- **Medicine-to-medicine information is not a disease.** Antidotes, "complementary to", "inimical to", "compare with", "follows well" are relations between medicines. Don't make them nodes or links.
- Skip non-clinical text: headings, authors' names, anecdotes, page references, dosage instructions, and philosophy.

### Step 4: Split into single entities and clean
Apply sections 5 and 6 to every extracted name.

### Step 5: Normalize, match, and deduplicate
Apply section 7. Reuse existing nodes where they match. Create new nodes only for names with no match.

### Step 6: Create links
Apply section 8.

### Step 7: Verify
Run every check in section 9. Fix any failure before writing the file.

### Step 8: Write and report
Write the updated `tips.json`, pretty-printed with 2-space indentation, then produce the report in section 10.

**Tip for execution:** When you have a code environment, do the matching, ID generation, deduplication, and verification in a script (Python or Node), not by eye. Make the extraction decisions yourself, then use the script to apply them exactly.

---

## 5. Rules for disease and symptom names

Each illness node must be **one single condition or symptom, written as a short name (usually 1 to 4 words, Title Case).**

### 5.1 Always split these
Split on commas, semicolons, slashes, bullets, line breaks, and on "and" / "or" when they join separate conditions.

| Source text | Illness nodes to create |
| :-- | :-- |
| `Cough, bronchitis, dyspnea` | Cough, Bronchitis, Dyspnea |
| `Gastralgia; nausea; heartburn` | Gastralgia, Nausea, Heartburn |
| `Sciatica and bleeding hemorrhoids` | Sciatica, Bleeding Hemorrhoids |
| `Fever / chills / body ache` | Fever, Chills, Body Ache |
| `Headache or vertigo` | Headache, Vertigo |

### 5.2 Keep together only when it is one recognized condition
The words are part of a single established name:
`Irritable Bowel Syndrome`, `Chronic Kidney Disease`, `Atopic Dermatitis`, `Attention Deficit Disorder`, `Nausea and Vomiting of Pregnancy`, `Migraine, Right-Sided` (here the comma is part of the name, not a separator).

If you are unsure whether a phrase is one condition or two, split it. Two small accurate nodes are better than one inaccurate long node.

### 5.3 Shorten descriptive phrases to the core condition
Source text often describes a symptom with extra detail. Reduce it to the condition itself:

| Source text | Illness node |
| :-- | :-- |
| `High fever with hot red skin` | High Fever |
| `Throbbing headache` | Headache |
| `Dilated pupils` | Dilated Pupils |
| `Cough with pain in head and stitches in chest on coughing` | Cough, Headache, Chest Pain (split into the separate complaints) |
| `Headache worse from sunlight` | Headache |

A short qualifier that identifies a clinically distinct condition may stay (`Right-Sided Migraine`, `Night Cough`, `Dry Cough`). Don't keep descriptive clauses, modalities ("worse from…", "better by…"), time-of-day details, or personality traits in the name.

### 5.4 Naming
- Title Case. Remove stray punctuation, numbering, and trailing periods.
- Use the standard medical term when the source uses a plain one (`loose motions` → `Diarrhea`). If there is no clear standard term, keep the source's own wording, shortened.
- Use the singular for conditions unless the plural is the standard name.

### 5.5 Never create illness nodes for
Headings (`Chapter 4`, `Clinical Notes`), page references, author comments, drug relations (antidotes, complementary, inimical), dosage or potency text, or anything that isn't a condition, disease, or symptom.

---

## 6. Rules for medicine names

Each medicine node must be **one single medicine, written as its canonical full name in Title Case.**

### 6.1 Always split
`Belladonna or Aconite` → Belladonna, Aconite.
`Calcarea Carbonica + Sulphur` → Calcarea Carbonica, Sulphur (two separate medicines, even if the source gives them together).

### 6.2 Strip noise from names
Remove all of the following from the medicine name:
- **Potencies and scales**: `3X`, `6X`, `30C`, `200C`, `1M`, `10M`, `CM`, `LM 1`, `0/1`, a bare number after the name (`Rhus Tox 200`), `Q`, `θ`, `MT`, `Mother Tincture`.
- **Dosage and frequency**: `tid`, `bid`, `qid`, `OD`, `SOS`, `stat`, `hourly`, `4 drops`, `2 pills`, `globules`, `tablets`.
- **Administration notes**: `in water`, `dry on tongue`, `external application`.

| Raw text | Medicine node |
| :-- | :-- |
| `Arnica Montana 30C 4 drops tid` | Arnica Montana |
| `Thuja Occ. Q (external)` | Thuja Occidentalis |
| `Rhus Tox. 200` | Rhus Toxicodendron |
| `Bryonia Alb - 1M` | Bryonia Alba |
| `Calc. Carb. 6X tablets` | Calcarea Carbonica |

### 6.3 Expand standard abbreviations
Expand them to the full canonical name when the expansion is unambiguous, e.g. `Ars. Alb.` → Arsenicum Album, `Nux Vom.` → Nux Vomica, `Lyc.` → Lycopodium Clavatum, `Nat. Mur.` → Natrum Muriaticum, `Puls.` → Pulsatilla.

If an abbreviation has several valid expansions (e.g. `Merc.`), pick the one the source's context supports. If the context can't decide, don't guess and don't create a node. Skip that mention and list it in the report notes.

### 6.4 Do not
Create medicine nodes for brand products, doses, or non-medicine items. Keep the name to the medicine only.

---

## 7. Normalization and duplicate detection

### 7.1 Matching key
```
key(name) = lowercase(name) with every whitespace character removed
```
Don't remove hyphens, apostrophes, parentheses, or slashes.

| Name | Key |
| :-- | :-- |
| `Arnica Montana` / `  ARNICA   montana ` | `arnicamontana` |
| `Bronchial Asthma` | `bronchialasthma` |
| `Type-2 Diabetes` | `type-2diabetes` |
| `Type 2 Diabetes` | `type2diabetes` |

### 7.2 Matching order
Compare the key of every extracted name against existing nodes **of the same type**, and against nodes you have already created earlier in this run.

1. **Same key → reuse.** Use the existing node's ID. Never create a second node.
2. **Obvious spelling variant of an existing name** (e.g. `Chamomila` for `Chamomilla`, `Gelsimium` for `Gelsemium`) → reuse the existing node and record the variant in the report notes.
3. **No match → create** a new node with a fresh, collision-checked `nanoid()`, using the cleaned name from sections 5 and 6.

A medicine node and an illness node are never merged with each other, even if the names match.

---

## 8. Creating links

- A link is `{ "medicineId": "...", "diseaseId": "..." }` and always goes from a medicine to an illness.
- Never link medicine to medicine or illness to illness.
- **Deduplicate on the pair `(medicineId, diseaseId)`.** Before adding a link, check that the same pair isn't already in the file or already added in this run. If it is, skip it. The same pair mentioned many times, in one file or across several, becomes one link.
- Create a link only after both its medicine node and illness node exist.

---

## 9. Verification (all must pass before writing)

- [ ] The JSON parses, and the top level has exactly `medicines`, `illnesses`, `links`.
- [ ] Every pre-existing node and link is still there with unchanged IDs and names.
- [ ] Every node has only `id` and `name`; every link has only `medicineId` and `diseaseId`.
- [ ] All IDs are unique across medicines and illnesses together, and match `[A-Za-z0-9_-]{21}` for new ones.
- [ ] Every `medicineId` exists in `medicines`, and every `diseaseId` exists in `illnesses`.
- [ ] No duplicate `(medicineId, diseaseId)` pairs.
- [ ] **No new node name contains a list.** Check every new name containing a comma, semicolon, slash, " and ", or " or ", or longer than about 5 words. Each is either a genuinely single recognized condition or it must be split. Fix before writing.
- [ ] No new medicine name contains a potency, dose, frequency, or administration text.
- [ ] No two new nodes of the same type share a normalized key.

If any check fails, fix the cause, then run all checks again.

---

## 10. Final report

After saving, give a short report:

```
Files processed: <names>
Medicines: <before> → <after> (+<new>, <reused> reused)
Illnesses: <before> → <after> (+<new>, <reused> reused)
Links:     <before> → <after> (+<new>, <duplicates skipped> skipped)

Notes:
- Spelling variants reused: <variant> → <existing name>
- Abbreviations skipped as unresolvable: <text> (<where it was>)
- Existing-data issues noticed: <e.g. two existing nodes with the same key>
- Anything else uncertain
```

Don't pause for approval on ordinary judgment calls. Decide from the text, follow the rules above, and list anything uncertain in Notes. Don't write to the file anything you couldn't verify.