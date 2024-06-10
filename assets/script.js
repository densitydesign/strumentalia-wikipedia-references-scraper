function escapeCSSId(id) {
  return id.replace(/([ #;?%&,.+*~\':"!^$[\]()=>|/@])/g, "\\$1");
}

document.getElementById("startYear").oninput = function () {
  document.getElementById("yearDisplay").innerText = this.value;
};

document.querySelector("button").onclick = function () {
  fetchRevisions();
};

async function fetchRevisions() {
  const pageTitle = document.getElementById("wikiPage").value;
  const baseApiUrl = "https://en.wikipedia.org/w/api.php";
  const startYear = parseInt(document.getElementById("startYear").value);

  let currentDate = new Date();
  let currentYear = currentDate.getFullYear();
  const resultsTable = document
    .getElementById("resultsTable")
    .getElementsByTagName("tbody")[0];

  for (let year = startYear; year <= currentYear; year++) {
    // Adjust this to the earliest year you want
    const timestamp = `${year}0101`;
    const revisionUrl = `${baseApiUrl}?action=query&prop=revisions&titles=${encodeURIComponent(
      pageTitle
    )}&rvlimit=1&rvdir=newer&rvstart=${timestamp}000000&format=json&origin=*`;

    try {
      const revisionResponse = await fetch(revisionUrl);
      const revisionData = await revisionResponse.json();
      const pages = revisionData.query.pages;
      const pageId = Object.keys(pages)[0];
      const revision = pages[pageId].revisions[0];
      const oldid = revision.revid;
      console.log(pageTitle, year, oldid);

      const parseUrl = `${baseApiUrl}?action=parse&oldid=${oldid}&format=json&origin=*`;
      console.log(parseUrl);
      const parseResponse = await fetch(parseUrl);
      const parseData = await parseResponse.json();
      const htmlContent = parseData.parse.text["*"];
      console.log(htmlContent);

      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, "text/html");
      const refs = doc.querySelectorAll("ol.references li");
      console.log(refs);
      refs.forEach((li) => {
        try {
          const liID = li.id;
          let span = li.querySelector("span.reference-text a.external.text");

          if (!span) {
            span = li.querySelector("span.reference-text a");
          }

          // Handle counting <b> tags inside span with class 'mw-cite-backlink'
          const backlinkSpan = li.querySelector("span.mw-cite-backlink");
          const boldTagsCount = backlinkSpan
            ? backlinkSpan.querySelectorAll("b").length
            : 0;

          let url = span.getAttribute("href");
          let text = span.textContent;
          let domain = url.startsWith("http")
            ? new URL(url).hostname
            : "Internal Wikipedia Link";

          // Handling anchor links
          if (url.startsWith("#")) {
            //console.log("citazione", url);

            const escapedId = escapeCSSId(url.substring(1));
            const targetCite = doc.querySelector(
              `[id="${escapedId}"] a.external.text`
            );

            //const targetCite = doc.querySelector(`cite${url} a.external`);
            //console.log("target", targetCite);
            if (targetCite) {
              url = targetCite.href;
              text = targetCite.textContent;
              domain = url.startsWith("http")
                ? new URL(url).hostname
                : "Internal Wikipedia Link";
            }
          }
          const fullText = li.innerText;

          const row = resultsTable.insertRow();
          const cellDate = row.insertCell(0);
          const cellID = row.insertCell(1);
          const cellTitle = row.insertCell(2);
          const cellUrl = row.insertCell(3);
          const cellDomain = row.insertCell(4);
          const cellCount = row.insertCell(5);
          const cellFullText = row.insertCell(6);

          cellDate.innerHTML = `${year}-01-01`;
          cellID.innerHTML = liID;
          cellTitle.innerHTML = text;
          cellUrl.innerHTML = url.startsWith("http")
            ? `<a href="${url}" target="_blank">${url}</a>`
            : `Anchor: ${url}`;
          cellDomain.innerHTML = domain;
          cellCount.innerHTML = boldTagsCount;
          cellFullText.innerHTML = fullText;
        } catch (e) {
          console.log("problem parsing ref", e);
        }
      });
    } catch (error) {
      console.error("Failed to fetch or parse data:", error);
    }
  }
}
