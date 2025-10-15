const owner = "DaintyDust";
const repo = "http-resources";
const branch = "main";
const shortBaseUrl = `https://raw.daintydust.dev/`;
const baseUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/`;
const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;

let allFiles = [];
let fileCount = 0;
let folderCount = 0;

async function fetchRepoTree() {
    try {
        document.getElementById("fileTree").innerHTML = '<div style="padding: 20px; color: #8b949e;">Loading repository contents...</div>';

        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const data = await response.json();
        allFiles = data.tree;

        buildFileTree(allFiles);
    } catch (error) {
        console.error("Error fetching repository:", error);
        document.getElementById("fileTree").innerHTML = `
      <div style="padding: 20px; color: #f85149;">
        ⚠️ Error loading repository contents: ${error.message}
      </div>
    `;
    }
}

function buildFileTree(files) {
    const tree = {};
    fileCount = 0;
    folderCount = 0;

    files.forEach((item) => {
        if (item.type === "blob") {
            fileCount++;
        } else if (item.type === "tree") {
            folderCount++;
        }

        const parts = item.path.split("/");
        let current = tree;

        parts.forEach((part, index) => {
            if (index === parts.length - 1) {
                if (item.type === "blob") {
                    current[part] = { type: "file", path: item.path };
                } else {
                    if (!current[part]) {
                        current[part] = { type: "folder", children: {} };
                    }
                }
            } else {
                if (!current[part]) {
                    current[part] = { type: "folder", children: {} };
                }
                current = current[part].children;
            }
        });
    });

    renderTree(tree);
    updateStats();
}

function renderTree(tree, parentElement = null, level = 0) {
    const container = parentElement || document.getElementById("fileTree");
    if (!parentElement) {
        container.innerHTML = "";
    }

    const entries = Object.entries(tree).sort((a, b) => {
        const aIsFolder = a[1].type === "folder";
        const bIsFolder = b[1].type === "folder";
        if (aIsFolder && !bIsFolder) return -1;
        if (!aIsFolder && bIsFolder) return 1;
        return a[0].localeCompare(b[0]);
    });

    entries.forEach(([name, item]) => {
        const treeItem = document.createElement("div");
        treeItem.className = "tree-item";
        treeItem.dataset.path = item.path ? item.path.toLowerCase() : name.toLowerCase();
        treeItem.style.paddingLeft = `${level * 20}px`;

        if (item.type === "folder") {
            const toggle = document.createElement("span");
            toggle.className = "toggle";
            toggle.innerHTML = "▶";
            toggle.style.cursor = "pointer";
            toggle.style.marginRight = "4px";
            toggle.style.display = "inline-block";
            toggle.style.width = "12px";
            toggle.style.transition = "transform 0.2s";

            const icon = document.createElement("span");
            icon.className = "icon";
            icon.innerHTML = "📁";

            const folderName = document.createElement("span");
            folderName.className = "folder";
            folderName.textContent = name + "/";
            folderName.style.cursor = "pointer";

            const childrenContainer = document.createElement("div");
            childrenContainer.className = "children";
            childrenContainer.style.display = "none";

            const toggleFolder = () => {
                const isOpen = childrenContainer.style.display !== "none";
                if (isOpen) {
                    childrenContainer.style.display = "none";
                    toggle.style.transform = "rotate(0deg)";
                } else {
                    childrenContainer.style.display = "block";
                    toggle.style.transform = "rotate(90deg)";
                }
            };

            toggle.addEventListener("click", toggleFolder);
            folderName.addEventListener("click", toggleFolder);

            treeItem.appendChild(toggle);
            treeItem.appendChild(icon);
            treeItem.appendChild(folderName);
            container.appendChild(treeItem);

            if (item.children && Object.keys(item.children).length > 0) {
                renderTree(item.children, childrenContainer, level + 1);
                container.appendChild(childrenContainer);
            }
        } else {
            const spacer = document.createElement("span");
            spacer.style.display = "inline-block";
            spacer.style.width = "16px";

            const icon = document.createElement("span");
            icon.className = "icon";
            icon.innerHTML = "📄";

            const link = document.createElement("a");
            link.className = "file";
            link.href = "#";
            link.textContent = name;
            link.dataset.filepath = item.path;
            link.addEventListener("click", (e) => {
                e.preventDefault();
                openPreview(item.path, name);
            });

            treeItem.appendChild(spacer);
            treeItem.appendChild(icon);
            treeItem.appendChild(link);
            container.appendChild(treeItem);
        }
    });
}

async function openPreview(filepath, filename) {
    const previewPane = document.getElementById("previewPane");
    const previewTitle = document.getElementById("previewTitle");
    const previewPath = document.getElementById("previewPath");
    const previewContent = document.getElementById("previewContent");
    const fileDetails = document.getElementById("fileDetails");
    const viewRawBtn = document.getElementById("viewRawBtn");

    previewPane.classList.add("active");
    previewTitle.textContent = filename;

    const rawUrl = baseUrl + filepath;
    const shortRawUrl = shortBaseUrl + filepath;
    previewPath.innerHTML = `<a href="${shortRawUrl}" target="_blank">${filepath}</a>`;
    previewContent.innerHTML = '<div class="preview-loading">Loading...</div>';
    fileDetails.style.display = "none";

    viewRawBtn.href = shortRawUrl;

    try {
        const fileInfo = allFiles.find((f) => f.path === filepath);

        const response = await fetch(rawUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.status}`);
        }

        const contentType = response.headers.get("content-type") || "";
        const contentLength = response.headers.get("content-length");
        const lastModified = response.headers.get("last-modified");

        if (contentType.includes("image")) {
            const img = document.createElement("img");
            img.src = rawUrl;
            img.alt = filename;

            img.onload = () => {
                let zoomLevel = null;
                if (img.naturalWidth < 100 || img.naturalHeight < 100) {
                    img.classList.add("small-image");
                    const scaleX = 200 / img.naturalWidth;
                    const scaleY = 200 / img.naturalHeight;
                    const scale = Math.max(scaleX, scaleY);
                    zoomLevel = Math.round(scale * 100);
                }

                previewContent.innerHTML = "";
                previewContent.appendChild(img);

                if (zoomLevel) {
                    const zoomIndicator = document.createElement("div");
                    zoomIndicator.className = "zoom-indicator";
                    zoomIndicator.textContent = `🔍 Zoomed to ${zoomLevel}% (Original: ${img.naturalWidth} × ${img.naturalHeight} px)`;
                    previewContent.appendChild(zoomIndicator);
                }

                showFileDetails({
                    type: "Image",
                    size: contentLength,
                    dimensions: `${img.naturalWidth} × ${img.naturalHeight} px`,
                    lastModified: lastModified,
                });
            };
        } else {
            const text = await response.text();
            previewContent.innerHTML = "";
            const pre = document.createElement("pre");
            pre.textContent = text;
            previewContent.appendChild(pre);

            showFileDetails({
                type: "Text File",
                size: contentLength || text.length,
                lines: text.split("\n").length,
                lastModified: lastModified,
            });
        }
    } catch (error) {
        previewContent.innerHTML = `
      <div style="color: #f85149; padding: 20px;">
        ⚠️ Error loading file: ${error.message}
      </div>
    `;
    }
}

function showFileDetails(details) {
    const fileDetails = document.getElementById("fileDetails");
    let html = '<div class="file-details-grid">';

    if (details.type) {
        html += `<div class="detail-label">Type:</div><div class="detail-value">${details.type}</div>`;
    }

    if (details.size) {
        const size = parseInt(details.size);
        const sizeStr = size > 1024 ? `${(size / 1024).toFixed(2)} KB` : `${size} bytes`;
        html += `<div class="detail-label">Size:</div><div class="detail-value">${sizeStr}</div>`;
    }

    if (details.dimensions) {
        html += `<div class="detail-label">Dimensions:</div><div class="detail-value">${details.dimensions}</div>`;
    }

    if (details.lines) {
        html += `<div class="detail-label">Lines:</div><div class="detail-value">${details.lines}</div>`;
    }

    if (details.lastModified) {
        const date = new Date(details.lastModified);
        html += `<div class="detail-label">Last Modified:</div><div class="detail-value">${date.toLocaleString()}</div>`;
    }

    html += "</div>";
    fileDetails.innerHTML = html;
    fileDetails.style.display = "block";
}

document.getElementById("closePreviewBtn").addEventListener("click", () => {
    document.getElementById("previewPane").classList.remove("active");
});

function updateStats() {
    document.getElementById("stats").innerHTML = `
    📊 Total: ${folderCount} folders, ${fileCount} files
  `;
}

const searchBox = document.getElementById("searchBox");
searchBox.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const treeItems = document.querySelectorAll(".tree-item");

    document.querySelectorAll(".path-breadcrumb").forEach((bc) => bc.remove());

    if (!searchTerm) {
        treeItems.forEach((item) => {
            item.style.display = "flex";
            item.classList.remove("search-result");
        });
        document.querySelectorAll(".children").forEach((child) => {
            child.style.display = "none";
        });
        document.querySelectorAll(".toggle").forEach((toggle) => {
            toggle.style.transform = "rotate(0deg)";
        });
        return;
    }

    treeItems.forEach((item) => {
        const path = item.getAttribute("data-path");
        if (path && path.includes(searchTerm)) {
            item.style.display = "flex";
            item.classList.add("search-result");

            const pathParts = path.split("/");
            if (pathParts.length > 1) {
                const parentPath = pathParts.slice(0, -1).join("/");
                const breadcrumb = document.createElement("span");
                breadcrumb.className = "path-breadcrumb";
                breadcrumb.textContent = `(in ${parentPath}/)`;
                item.appendChild(breadcrumb);
            }

            let parent = item.parentElement;
            while (parent && parent.classList.contains("children")) {
                parent.style.display = "block";
                const prevSibling = parent.previousElementSibling;
                if (prevSibling && prevSibling.querySelector(".toggle")) {
                    const toggle = prevSibling.querySelector(".toggle");
                    toggle.style.transform = "rotate(90deg)";
                }
                parent = parent.parentElement.parentElement;
            }
        } else {
            item.style.display = "none";
            item.classList.remove("search-result");
        }
    });
});

fetchRepoTree();
