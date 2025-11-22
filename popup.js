document.addEventListener("DOMContentLoaded", function () {
    const getHtmlButton = document.getElementById("getHtmlButton");
    if (getHtmlButton) {
        getHtmlButton.addEventListener("click", function () {
            chrome.runtime.sendMessage({ action: "getHTMLCode" });
        });
    }
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === "htmlCode") {
        try {
            const htmlCode = message.data;
            if (!htmlCode) {
                console.error("No HTML code received");
                return;
            }
            
            const tables = extractTables(htmlCode);
            const selector = "#accordion"; // Assuming this is the container for course names
            const extractedText = extractTextFromElements(htmlCode, selector);
            
            clearTableRows();
            
            if (tables.length === 0) {
                showEmptyState("No tables found. Please ensure you are on the Marks page.");
                return;
            }

            const results = processCourseData(tables, extractedText);
            populateTable(results);
        } catch (error) {
            console.error("Error processing data:", error);
            showEmptyState("An error occurred while processing data.");
        }
    }
});

function populateTable(results) {
    const tableBody = document.querySelector("#marksTable tbody");
    if (!tableBody) return;

    // Remove empty state row if it exists
    const emptyState = document.getElementById("emptyStateRow");
    if (emptyState) emptyState.remove();

    results.forEach(rowData => {
        const row = document.createElement("tr");
        
        rowData.forEach((cellData, index) => {
            const cell = document.createElement("td");
            cell.textContent = cellData;
            
            // Add classes for styling specific columns
            if (index >= 4) { // Grade columns
                 cell.classList.add("status-number");
                 if (cellData === "✅") {
                     cell.classList.add("status-check");
                 }
            }
            
            row.appendChild(cell);
        });
        
        tableBody.appendChild(row);
    });
}

function showEmptyState(message) {
    const tableBody = document.querySelector("#marksTable tbody");
    if (!tableBody) return;
    
    tableBody.innerHTML = `
        <tr id="emptyStateRow">
            <td colspan="15" class="empty-state">
                ${message}
            </td>
        </tr>
    `;
}

function extractTables(htmlCode) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlCode, "text/html");
    const tables = doc.querySelectorAll("table");

    const tableData = [];

    tables.forEach(table => {
        const rows = table.rows;
        const tableRows = [];

        for (let i = 0; i < rows.length; i++) {
            const rowData = [];
            const cells = rows[i].cells;

            for (let j = 0; j < cells.length; j++) {
                const cellData = cells[j].innerText.trim();
                rowData.push(cellData);
            }

            tableRows.push(rowData);
        }

        tableData.push(tableRows);
    });

    return tableData;
}

function clearTableRows() {
    const tableBody = document.querySelector("#marksTable tbody");
    if (tableBody) tableBody.innerHTML = "";
}

function extractTextFromElements(htmlCode, selector) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlCode, "text/html");
    const textData = [];

    const elements = doc.querySelectorAll(selector);
    elements.forEach(element => {
        // Attempt to find the course name. 
        // Based on original code: element.firstElementChild.innerText
        // We'll be a bit more defensive.
        const firstChild = element.firstElementChild;
        if (firstChild) {
            // Clean up the text (remove newlines, extra spaces)
            let text = firstChild.innerText.replace(/\s+/g, ' ').trim();
            textData.push(text);
        } else {
            textData.push("Unknown Course");
        }
    });
    
    return textData;
}

function calculateRequiredMarks(threshold, obtained) {
    const diff = (threshold - obtained);
    // If diff is negative, it means we already have more than the threshold
    return diff <= 0 ? "✅" : diff.toFixed(2);
}

function processCourseData(tables, courseNames) {
    const resultArrays = [];
    let courseIndex = 0;
    
    // Accumulators for the current course
    let totalMarks = 0;
    let obtainedMarks = 0;
    let averageMarks = 0;

    tables.forEach((tableRows) => {
        // Iterate through rows, skipping header (index 0) and potentially footer
        // The original code started at index 1 and went to length - 1
        
        for (let i = 1; i < tableRows.length - 1; i++) {
            const row = tableRows[i];
            
            // Ensure row has enough columns. Original code accessed indices 1, 3, 4.
            // 0: Name?, 1: Weight/Total?, 2: ?, 3: Obtained?, 4: Average?
            // Let's stick to the original logic but make it safe.
            if (row.length < 5) continue;

            let weight = parseFloat(row[1]) || 0;
            let marks = parseFloat(row[3]) || 0;
            let avg = parseFloat(row[4]) || 0;

            if (weight === 0 || marks === 0 || avg === 0) {
                continue;
            }

            // Calculate weighted average contribution
            // Ratio = Class Average / Total Marks for that assignment
            // Contribution = Ratio * Weight
            let ratio = avg / marks;
            averageMarks += ratio * weight;
        }

        const finalRow = tableRows[tableRows.length - 1];
        if (!finalRow || finalRow.length < 3) return; // Skip if invalid

        const firstCell = finalRow[0];

        // Check if this is a summary row
        if (firstCell === "Total Marks") {
            const courseName = courseNames[courseIndex] || `Course ${courseIndex + 1}`;
            
            resultArrays.push([
                courseName,
                totalMarks.toFixed(2),
                obtainedMarks.toFixed(2),
                averageMarks.toFixed(2),
                calculateRequiredMarks(90, obtainedMarks),  // A+
                calculateRequiredMarks(86, obtainedMarks),  // A
                calculateRequiredMarks(82, obtainedMarks),  // A-
                calculateRequiredMarks(78, obtainedMarks),  // B+
                calculateRequiredMarks(74, obtainedMarks),  // B
                calculateRequiredMarks(70, obtainedMarks),  // B-
                calculateRequiredMarks(66, obtainedMarks),  // C+
                calculateRequiredMarks(62, obtainedMarks),  // C
                calculateRequiredMarks(58, obtainedMarks),  // C-
                calculateRequiredMarks(54, obtainedMarks),  // D+
                calculateRequiredMarks(50, obtainedMarks)   // D
            ]);

            // Reset for next course
            totalMarks = 0;
            obtainedMarks = 0;
            averageMarks = 0;
            courseIndex++;
        } 
        // Handle cases where the table might be just a summary or different format?
        // Original code had: else if (finalElement[0] === "100.00" || finalElement[0] === "99.00")
        // This looks like a hack for specific edge cases. I'll keep it but clean it up.
        else if (firstCell === "100.00" || firstCell === "99.00") {
             const courseName = courseNames[courseIndex] || `Course ${courseIndex + 1}`;
             // Assuming finalRow structure is [Total, Obtained, Average] or similar?
             // Original: finalElement[0], finalElement[1], finalElement[2]
             resultArrays.push([
                 courseName, 
                 firstCell, 
                 finalRow[1] || "0", 
                 finalRow[2] || "0",
                 "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-" // No projection for this case
             ]);
             
             courseIndex++;
             totalMarks = 0;
             obtainedMarks = 0;
             averageMarks = 0;
        } 
        else {
            // Accumulate totals from the final row of a sub-table (e.g. assignments, quizzes)
            // Original: totalMarks += parseFloat(finalElement[1]); obtainedMarks += parseFloat(finalElement[2]);
            totalMarks += parseFloat(finalRow[1]) || 0;
            obtainedMarks += parseFloat(finalRow[2]) || 0;
        }
    });

    return resultArrays;
}