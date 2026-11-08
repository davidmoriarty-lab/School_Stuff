# **HONORS CHEMISTRY RESOURCE HUB: [https://davidmoriarty-lab.github.io/School_Stuff/honors-chemistry/](https://davidmoriarty-lab.github.io/School_Stuff/honors-chemistry/)**

One shared place for the honors chemistry team's notes, worksheets, homework, tests, labs and virtual labs. Open the link above to search everything, switch between unit tabs, **download** any file, or **print** it straight from the page.

## What teachers can do on the page
- **Search** the box at the top. It looks at titles *and* the words inside each document (for example "molar mass" or "limiting reagent").
- **Unit tabs** (Unit 0 to Unit 8, Course-wide, Unsorted) filter to one unit. The number under each tab is how many files match.
- **Type buttons** narrow to Notes, Worksheets, Homework, Tests and Quizzes, Labs, or Virtual Labs.
- **Student copies / Teacher editions and keys** separates blank copies from answer keys and teacher editions.
- **Download** gets the original file (Word, PDF, and so on). **Download PDF** gets a PDF version of a Word file.
- **Print** opens the print window for that file. If a browser blocks it, use **Open** and print from the new tab.

## Adding files (no coding)
1. On GitHub, open `honors-chemistry` > `Units` > the unit folder (for example `Unit 5 - Moles and Molar Quantities`).
2. Click **Add file > Upload files**, drag your files in, and click **Commit changes**.
3. Wait two to three minutes. A background job converts Word files to PDF, reads the text for search, and rebuilds the page. Refresh the hub to see the new files.

**Type folders are optional.** Inside a unit you can drop files straight in, or put them in a folder named `Notes`, `Worksheets`, `Homework`, `Tests and Quizzes`, `Labs`, `Review`, `Slides` or `Reference`. Without a type folder, the hub guesses the type from the file name (words like *worksheet*, *homework*, *test*, *quiz*, *lab*, *notes*). A file whose name contains **KEY**, **TEACHER** or **ANSWER** is marked as a teacher copy.

**Not sure which unit?** Put it in `Unsorted`. It appears on the Unsorted tab until someone moves it. `Course-wide` is for things used all year (nomenclature, lab safety, and so on).

**Other changes:**
- To rename or delete a file, open it on GitHub and use the three dots menu. The hub updates the same way.
- To add a new unit, create a folder under `Units` named like `Unit 9 - Nuclear Chemistry`.
- Word, PowerPoint and Excel files are converted to PDF for printing. PDFs and images print as they are.

## Virtual labs and links
Edit `virtual-labs.csv` (click the pencil icon on GitHub) and add a row:

| Unit | Title | URL | Description |
| --- | --- | --- | --- |
| 5 | Mole Ratio Simulation | https://example.com/sim | One sentence about what students do |

The Unit column can be a number (`5`), `Unit 5`, or a folder name such as `Course-wide`. The URL must start with `https://`.

## Who can upload
Anyone with a GitHub account can view and download from the hub. To upload, a teacher needs write access: the repository owner adds them under **Settings > Collaborators**.

## Notes
- The repository and the hub are public. Do not add anything with student names or student data.
- `index.html` and the `_pdf` folder are written by the rebuild job. Do not edit them by hand.
- If the page ever looks out of date, go to the **Actions** tab, choose **Rebuild honors chemistry hub**, and click **Run workflow**.
- To rebuild on your own computer: `python3 honors-chemistry/_build/build_hub.py` (LibreOffice and poppler-utils make the PDF conversion and text search work).
- The first files in here were copied from `chemistry_notes/Honors Chemistry/`. That folder still holds the scripts that generate the notes packets.
