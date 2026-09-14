import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  Packer,
  Header,
  Footer,
  PageNumber
} from "docx";
import saveAs from "file-saver";
import { ExamPaper } from "../types";

export async function exportExamToDocx(paper: Partial<ExamPaper>, includeMarkingScheme: boolean = true) {
  const schoolName = (paper.schoolName || "ST. MARY'S COLLEGE KISUBI").toUpperCase();
  const location = paper.schoolLocation || "Wakiso District, Uganda";
  const poBox = paper.poBox || "P.O. Box 48, Entebbe";
  const phone = paper.phoneContact || "+256 414 321 000";
  const motto = paper.motto || "Semper Ultra (Always Further)";
  const centreNo = paper.centreNumber || "U3206";
  const examTitle = (paper.examTitle || "UGANDA LOWER SECONDARY CERTIFICATE OF EDUCATION (NCDC / CBC)").toUpperCase();
  const examType = (paper.examType || "End of Term Assessment").toUpperCase();
  const subjectName = (paper.subjectName || "Agriculture").toUpperCase();
  const subjectCode = paper.subjectCode || "553/1";
  const cls = paper.class || "S.2";
  const term = (paper.term || "Term 2").toUpperCase();
  const year = paper.year || 2026;
  const duration = paper.duration || "2 Hours 15 Minutes";
  const totalMarks = paper.totalMarks || 100;
  const rules = paper.rulesAndRegulations || `1. This examination paper consists of Section A and Section B.
2. Answer all questions in Section A and any two questions from Section B.
3. Write all responses neatly in the spaces provided.
4. Candidates must demonstrate practical problem-solving in real-life contexts.
5. Mathematical tables and silent non-programmable calculators may be used.
6. Mobile phones and unauthorized revision notes are strictly prohibited.
7. Fill in Candidate Name and Assessment Random Number on the cover page.`;

  // Parse raw text into structured paragraphs
  const contentLines = (paper.content || "").split("\n");
  const examParagraphs: (Paragraph | Table)[] = [];

  // Header Box
  examParagraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: schoolName, bold: true, size: 32, font: "Arial" }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `${poBox} • ${location} • Tel: ${phone}`, size: 20, font: "Arial" }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `Motto: "${motto}"`, italics: true, size: 20, font: "Arial" }),
        new TextRun({ text: `   |   CENTRE NUMBER: ${centreNo}`, bold: true, size: 20, font: "Arial" }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: examTitle, bold: true, size: 24, font: "Arial" }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `${examType} • ${year}`, bold: true, size: 22, color: "333333", font: "Arial" }),
      ],
      spacing: { after: 120 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `${subjectName} • ${subjectCode}`, bold: true, size: 28, font: "Arial" }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `CLASS: ${cls} • ${term}`, bold: true, size: 22, font: "Arial" }),
      ],
      spacing: { after: 120 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `TIME ALLOWED: ${duration}    |    TOTAL MARKS: ${totalMarks} MARKS`, bold: true, size: 20, font: "Arial" }),
        new TextRun({ text: paper.difficultyLevel ? `    |    LEVEL: ${paper.difficultyLevel.toUpperCase()}` : "", bold: true, size: 20, font: "Arial" }),
      ],
      spacing: { after: paper.targetStudentWeaknesses || paper.customInstructions ? 120 : 300 },
    }),
    ...(paper.targetStudentWeaknesses ? [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "[ DIAGNOSTIC & REMEDIAL ASSESSMENT: TARGETING IDENTIFIED STUDENT WEAKNESSES ]", bold: true, italics: true, color: "0F5132", size: 19, font: "Arial" }),
        ],
        spacing: { after: 120 },
      })
    ] : []),
    ...(paper.customInstructions ? [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: `Focus Area: ${paper.customInstructions}`, italics: true, color: "444444", size: 18, font: "Arial" }),
        ],
        spacing: { after: 200 },
      })
    ] : [])
  );

  // Instructions Table
  examParagraphs.push(
    new Paragraph({
      children: [
        new TextRun({ text: "INSTRUCTIONS TO CANDIDATES (RULES & REGULATIONS):", bold: true, size: 20, font: "Arial" }),
      ],
      spacing: { after: 100 },
    })
  );

  const rulesList = rules.split("\n").filter(r => r.trim().length > 0);
  for (const r of rulesList) {
    examParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: r.trim(), size: 19, font: "Arial" }),
        ],
        spacing: { after: 60 },
        indent: { left: 240 },
      })
    );
  }

  // Candidate ID Table
  examParagraphs.push(
    new Paragraph({ spacing: { before: 200, after: 100 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: "Candidate Name:", bold: true, font: "Arial", size: 19 })] })],
            }),
            new TableCell({
              width: { size: 70, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: "______________________________________________________", font: "Arial" })] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Random / Index No:", bold: true, font: "Arial", size: 19 })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "_________________________   Stream: ____________________", font: "Arial" })] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Signature & Date:", bold: true, font: "Arial", size: 19 })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "_________________________   Date:   ____________________", font: "Arial" })] })],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { before: 240, after: 120 } })
  );

  // Examiner Scoring Grid
  examParagraphs.push(
    new Paragraph({
      children: [new TextRun({ text: "FOR EXAMINER'S USE ONLY:", bold: true, font: "Arial", size: 18 })],
      spacing: { after: 80 }
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Section", bold: true, size: 18, font: "Arial" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Item / Question", bold: true, size: 18, font: "Arial" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Max Mark", bold: true, size: 18, font: "Arial" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Mark Scored", bold: true, size: 18, font: "Arial" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "NCDC Level (1/2/3)", bold: true, size: 18, font: "Arial" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Examiner Initial", bold: true, size: 18, font: "Arial" })] })] }),
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "A", font: "Arial", size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Item 1", font: "Arial", size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "10", font: "Arial", size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", font: "Arial" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", font: "Arial" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", font: "Arial" })] })] }),
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "A", font: "Arial", size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Item 2", font: "Arial", size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "10", font: "Arial", size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", font: "Arial" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", font: "Arial" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", font: "Arial" })] })] }),
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "A", font: "Arial", size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Item 3", font: "Arial", size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "10", font: "Arial", size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", font: "Arial" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", font: "Arial" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", font: "Arial" })] })] }),
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "A", font: "Arial", size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Item 4", font: "Arial", size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "10", font: "Arial", size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", font: "Arial" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", font: "Arial" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", font: "Arial" })] })] }),
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "B", font: "Arial", size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Item 5 (AOI)", font: "Arial", size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "30", font: "Arial", size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", font: "Arial" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", font: "Arial" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", font: "Arial" })] })] }),
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "B", font: "Arial", size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Item 6 (AOI)", font: "Arial", size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "30", font: "Arial", size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", font: "Arial" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", font: "Arial" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", font: "Arial" })] })] }),
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TOTAL", bold: true, font: "Arial", size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", font: "Arial" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${totalMarks}`, bold: true, font: "Arial", size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", font: "Arial" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", font: "Arial" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", font: "Arial" })] })] }),
          ]
        }),
      ]
    }),
    new Paragraph({ spacing: { before: 300, after: 100 } })
  );

  // Parse questions and body lines
  for (const line of contentLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      examParagraphs.push(new Paragraph({ spacing: { before: 80, after: 80 } }));
      continue;
    }

    if (trimmed.startsWith("## ") || trimmed.startsWith("### SECTION")) {
      examParagraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [
            new TextRun({
              text: trimmed.replace(/^#+\s*/, "").replace(/\*\*/g, ""),
              bold: true,
              size: 24,
              font: "Arial"
            })
          ],
          spacing: { before: 240, after: 120 }
        })
      );
    } else if (trimmed.startsWith("### ") || trimmed.startsWith("#### Item")) {
      examParagraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun({
              text: trimmed.replace(/^#+\s*/, "").replace(/\*\*/g, ""),
              bold: true,
              size: 21,
              font: "Arial"
            })
          ],
          spacing: { before: 180, after: 80 }
        })
      );
    } else if (trimmed.startsWith("*(") || trimmed.startsWith("(") || trimmed.match(/^\([a-z]\)/i)) {
      examParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmed.replace(/\*\*/g, ""),
              bold: true,
              size: 20,
              font: "Arial"
            })
          ],
          spacing: { before: 100, after: 60 },
          indent: { left: 240 }
        })
      );
    } else if (trimmed.includes("_____")) {
      examParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmed,
              color: "888888",
              font: "Arial"
            })
          ],
          spacing: { before: 60, after: 60 }
        })
      );
    } else {
      examParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmed.replace(/\*\*/g, ""),
              size: 20,
              font: "Arial"
            })
          ],
          spacing: { before: 40, after: 40 }
        })
      );
    }
  }

  // If Marking Scheme is included
  if (includeMarkingScheme && paper.markingGuide) {
    examParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "==================================================================",
            bold: true,
            color: "999999",
            font: "Arial"
          })
        ],
        spacing: { before: 400, after: 200 }
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "CONFIDENTIAL: TEACHER & EXAMINER MARKING SCHEME & NCDC RUBRICS",
            bold: true,
            size: 24,
            font: "Arial"
          })
        ],
        spacing: { before: 100, after: 200 }
      })
    );

    const guideLines = paper.markingGuide.split("\n");
    for (const gLine of guideLines) {
      const gTrimmed = gLine.trim();
      if (!gTrimmed) continue;

      if (gTrimmed.startsWith("#")) {
        examParagraphs.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: gTrimmed.replace(/^#+\s*/, "").replace(/\*\*/g, ""),
                bold: true,
                size: 21,
                font: "Arial"
              })
            ],
            spacing: { before: 180, after: 80 }
          })
        );
      } else {
        examParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: gTrimmed.replace(/\*\*/g, ""),
                size: 19,
                font: "Arial"
              })
            ],
            spacing: { before: 40, after: 40 }
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,    // 0.5 in
              right: 720,
              bottom: 720,
              left: 720,
            }
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `${schoolName} • ${subjectName} (${cls}, ${term})`, size: 16, color: "777777", font: "Arial" })
                ]
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Page ", size: 16, color: "777777", font: "Arial" }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: "777777",
                    font: "Arial"
                  }),
                  new TextRun({ text: " • NCDC CBC Official Standard Assessment", size: 16, color: "777777", font: "Arial" })
                ]
              })
            ]
          })
        },
        children: examParagraphs,
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const cleanFilename = `${schoolName.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20)}_${subjectName}_${cls}_${term}_Exam.docx`;
  saveAs(blob, cleanFilename);
}
