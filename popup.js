document.addEventListener("DOMContentLoaded", function () {
    var getHtmlButton = document.getElementById("getHtmlButton");
    getHtmlButton.addEventListener("click", function () {
        chrome.runtime.sendMessage({ action: "getHTMLCode" });
    });
})

var activeTabData = "", newTabData = "";
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === "htmlCode") {
        var htmlCode = message.data;
        var tables = extractTables(htmlCode);
        var selector = "#accordion"
        const extractedText = extractTextFromElements(htmlCode, selector);
        clearTableRows()
        const results = makeResultArrays(tables, extractedText);
        populateTable(results, extractedText)
    }
});

function populateTable(results, text) {
    var tableBody = document.querySelector("#marksTable tbody");
    for (var i = 0; i < results.length; i++) {
        var row = document.createElement("tr");
        for (var j = 0; j < 15; j++) {
            var cell = document.createElement("td");
            cell.textContent = results[i][j];
            row.appendChild(cell);
        }
        tableBody.appendChild(row);
    };
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
    var tableBody = document.querySelector("#marksTable tbody");
    tableBody.innerHTML = "";
}

function extractTextFromElements(htmlCode, selector) {
    const parser = new DOMParser();
    const textData = [];

    const doc = parser.parseFromString(htmlCode, "text/html");
    console.log(doc)
    const elements = doc.querySelectorAll(selector);
    for (let index = 0; index < elements.length; index++) {
        const element = elements[index];
        const ele = element.firstElementChild;
        let text = ele.innerText;
        textData.push(text);
    }
    return textData;
}

function makeResultArrays(tables, text) {
    const resultArrays = [];
    console.log(tables)
    let courseIndex = 0;
    let totalMarks = parseFloat("0");
    let obtainedMarks = parseFloat("0");
    let averageMarks = parseFloat("0");
    for (let index = 0; index < tables.length; index++) {
        const element = tables[index];
        for (let insider = 1; insider < element.length - 1; insider++) {
            let weight = parseFloat(element[insider][1]) ? parseFloat(element[insider][1]) : 0;
            let marks = parseFloat(element[insider][3]) ? parseFloat(element[insider][3]) : 0;
            let avg = parseFloat(element[insider][4]) ? parseFloat(element[insider][4]) : 0;
            if (weight == 0 || marks == 0 || avg == 0) {
                continue;
            }
            let ratio = parseFloat(avg / marks)
            averageMarks += ratio * weight;
        }
        const finalElement = element[element.length - 1];
        console.log(finalElement)
        if (finalElement[0] === "Total Marks") {
            resultArrays.push(
                [text[courseIndex],
                totalMarks.toFixed(2),
                obtainedMarks.toFixed(2),
                (90 - obtainedMarks).toFixed(2),
                (86 - obtainedMarks).toFixed(2),
                (82 - obtainedMarks).toFixed(2),
                (78 - obtainedMarks).toFixed(2),
                (74 - obtainedMarks).toFixed(2),
                (70 - obtainedMarks).toFixed(2),
                (66 - obtainedMarks).toFixed(2),
                (62 - obtainedMarks).toFixed(2),
                (58 - obtainedMarks).toFixed(2),
                (54 - obtainedMarks).toFixed(2),
                (50 - obtainedMarks).toFixed(2),
                averageMarks.toFixed(2)]);
            totalMarks = 0;
            obtainedMarks = 0;
            averageMarks = 0;
            courseIndex++;
        } else if (finalElement[0] === "100.00" || finalElement[0] === "99.00") {
            resultArrays.push([text[courseIndex], finalElement[0], finalElement[1], finalElement[2]])
            courseIndex++;
            totalMarks = 0;
            obtainedMarks = 0;
            averageMarks = 0;
        } else {
            totalMarks += parseFloat(finalElement[1]);
            obtainedMarks += parseFloat(finalElement[2]);
        }

    }
    return resultArrays;
}
