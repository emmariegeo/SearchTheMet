/**
 * Info: https://metmuseum.github.io/
 * API root: https://collectionapi.metmuseum.org/public/collection/v1/
 */

// Global variables
let currentPage = 1;
let numPages = 1;
let currentData;

// Devtools Issue: (Security/CORS) Indicate whether to send a cookie in a cross-site request by specifying its SameSite attribute
// Used this header in fetch() requests, but I belive I would need to use when getting images from API using img src to fully resolve this.
// Probably would be best to preload images.
let myHeaders = new Headers({
  'Set-Cookie': 'SameSite=Lax'
});

/**
 * Get list of departments from API and add to department selection input
 */
async function getDepartments() {
  let url = `https://collectionapi.metmuseum.org/public/collection/v1/departments`;
  let response = await fetch(url, myHeaders);
  let data = await response.json();
  const departmentSelect = document.querySelector("#department-select");
  departmentSelect.innerHTML = `<option value="" selected>All Departments</option>`;
  for (let i = 0; i < data.departments.length; i++) {
    departmentSelect.innerHTML += `<option value=${data.departments[i].departmentId}>${data.departments[i].displayName}</option>`;
  }
}

/**
 * Search by department and keyword, optionally only show objects on display
 * @returns data (total, objectIds)
 */
async function search() {
  const queryInput = document.querySelector("#query-input");
  const departmentSelect = document.querySelector("#department-select");
  if (queryInput.value !== "") {
    objectsLoading();
    document.querySelector("#invalid-search").classList.remove("alert", "alert-danger");
    document.querySelector("#invalid-search").innerHTML = "";
    let param = queryInput.value;

    const onDisplayCheck = document.querySelector("#on-display-check");

    // In theory, this search should return only results with images
    // There seem to be some bugs with the API regarding search results. (https://github.com/metmuseum/openaccess/issues/38)
    let url = `https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&`;

    if (departmentSelect.value !== "") {
      url += `departmentId=${departmentSelect.value}&`;
    }

    if (onDisplayCheck.checked) {
      url += `isOnView=true&q=${param}`;
    } else {
      url += `q=${param}`;
    }

    let response = await fetch(url, myHeaders);
    data = await response.json();
  } else if (queryInput.value == "") {
    document.querySelector("#invalid-search").classList.add("alert", "alert-danger");
    document.querySelector("#invalid-search").innerHTML = "You must type in a keyword to search.";
    return;
  }

  // store current data
  currentData = data;
  // create pages based on number of objects returned
  createPages(data.total);

  // display objects, starting from 0.
  displayObjects(1, data.total, data.objectIDs);
}

/**
 * Display loading spinner in objects container
 */
function objectsLoading() {
  const objectsContainer = document.querySelector("#objects-container");
  const objectsInfo = document.querySelector("#objects-info");
  objectsInfo.innerHTML = "";
  objectsContainer.innerHTML =
    `<div class="d-flex justify-content-center align-items-center w-100" style="height: 60vh;">
        <div class="spinner-border" style="width: 3rem; height: 3rem;" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    </div>`;
}

/**
 * Replace broken image links from API with placeholder.
 * @param {*} event 
 */
function handleBrokenImage(event) {
  event.target.src = 'img/placeholder.png';
  event.target.onerror = null;
}

/**
 * When random button is clicked, get 8 random objects from API and display
 */
async function getRandom() {
  let url = `https://collectionapi.metmuseum.org/public/collection/v1/objects`;
  objectsLoading();
  let response = await fetch(url, myHeaders);
  data = await response.json();

  currentData = {
    total: 8,
    objectIDs: []
  };

  for (let i = 0; i < 8; i++) {
    // get random index in objectIDs
    currentData.objectIDs.push(data.objectIDs[Math.floor(Math.random() * (data.total - 1))]);
  }

  createPages(currentData.total);
  displayObjects(1, currentData.total, currentData.objectIDs);
}

/**
 * Display results
 * @param {*} pageIndex int representing page index to display
 * @param {*} total int representing total num of objects
 * @param {*} objectIDs array of objectIDs corresponding to each object
 */
async function displayObjects(pageIndex, total, objectIDs) {
  const objectsInfo = document.querySelector("#objects-info");
  const objectsContainer = document.querySelector("#objects-container");
  objectsContainer.innerHTML = "";
  if (total != 0) {
    objectsInfo.innerHTML = `<p>${total} results. Displaying results ${(pageIndex - 1) * 8}-${(pageIndex - 1) * 8 + 8 > total ? total : (pageIndex - 1) * 8 + 8
      } of ${total < 40 ? total : 'the first ' + 40}.</p>`;

    // Slice 8 objects depending on page
    for (let objectID of objectIDs.slice((pageIndex - 1) * 8, (pageIndex - 1) * 8 + 8)) {
      getObjectDetail(objectID).then((objectData) => {
        objectsContainer.innerHTML += createObjectCard(objectID, objectData);
      });
    }
  } else {
    objectsInfo.innerHTML = `<p>No results found.</p>`;
  }
}

/**
 * Generate HTML for a card with Object Data
 * @param {*} objectID int representing object ID
 * @param {*} objectData object data
 * @returns 
 */
function createObjectCard(objectID, objectData) {
  return (
    `<div class="col">
            <div class="card text-center h-100">
                <img src=${objectData.primaryImageSmall !== ""
      ? objectData.primaryImageSmall
      : "img/copyrighted.png"
    } class="card-img-top prev-img" alt="..." onerror="handleBrokenImage(event)">
                <div class="card-body">
                    <h5 class="card-title" id="object-title">${objectData.title}</h5>
                    <h6 class="card-subtitle mb-2 text-muted">${objectData.objectName}</h6>
                    <p class="card-text">
                        <ul class="list-group list-group-flush">
                            ${objectData.artistRole !== "" ? '<li class="list-group-item"><strong>' + objectData.artistRole + '</strong>: ' + objectData.artistDisplayName + '</li>' : ''}
                            <li class="list-group-item"><strong>Department:</strong> ${objectData.department}</li>
                            <li class="list-group-item">
                                ${!objectData.isPublicDomain
      ? `<span class="badge rounded-pill text-bg-warning">Copyright Restrictions</span>`
      : `<span class="badge rounded-pill text-bg-info">Open Access</span>`}
                                ${objectData.GalleryNumber !== "" ? `<span class="badge rounded-pill text-bg-success">Gallery ${objectData.GalleryNumber}</span>` : ""}
                            </li>
                        </ul>
                    </p>
                    <button type="button" class="btn btn-primary" data-bs-toggle="modal"
                        data-bs-target="#detailModal" data-bs-whatever="${objectID}">Learn More</button>
                </div>
                <div class="card-footer">
                    ${objectData.tags ? createTags(objectData.tags) : ''}
                </div>
            </div>
        </div>`);
}

/**
 * Generates HTML for badges for each tag in tags
 * @param {*} tags array
 * @returns String containing html elements representing each tag
 */
function createTags(tags) {
  tagString = '<small>Tags:</small><br>';
  tags.forEach(tag => {
    tagString += '<span class="badge rounded-pill text-bg-secondary">#' + tag.term + '</span> '
  });
  return tagString;
}

/**
 * Generate pagination HTML
 * @param {*} total num of objects
 */
function createPages(total) {
  const pagination = document.querySelector(".pagination");
  if (total > 8) {
    // number of pages to display objects
    numPages = Math.floor(total / 8 + 1);
    // max of 5 pages or 40 objects
    if (numPages > 5) {
      numPages = 5;
    }

    pagination.innerHTML =
      `<li class="page-item disabled" id="prev-page" onclick="prevPage()">
            <a href="#" class="page-link">Previous</a>
        </li>
        <li class="page-item active" id="page-1" onclick="selectPage(1)"><a href="#" class="page-link">1</a></li>`;
    for (let i = 2; i <= numPages; i++) {
      pagination.innerHTML += `<li class="page-item" id="page-${i}" onclick="selectPage(${i})"><a href="#" class="page-link" >${i}</a></li>`;
    }
    pagination.innerHTML +=
      `<li class="page-item" id="next-page" onclick="nextPage()">
            <a href="#" class="page-link" >Next</a>
        </li>`;
  } else {
    pagination.innerHTML = "";
  }
  currentPage = 1;
}

/**
 * Given index, update pagination and display page at index
 * @param {*} index 
 */
function selectPage(index) {
  const current = document.querySelector(`#page-${currentPage}`);
  current.classList.remove("active");
  const selected = document.querySelector(`#page-${index}`);
  selected.classList.add("active");

  if (index == numPages) {
    document.querySelector(`#next-page`).classList.add("disabled");
    document.querySelector(`#next-page`).setAttribute("disabled", true);
  } else {
    document.querySelector(`#next-page`).classList.remove("disabled");
    document.querySelector(`#next-page`).removeAttribute("disabled");
  }

  if (index == 1) {
    document.querySelector(`#prev-page`).classList.add("disabled");
    document.querySelector(`#prev-page`).setAttribute("disabled", true);
  } else {
    document.querySelector(`#prev-page`).classList.remove("disabled");
    document.querySelector(`#prev-page`).removeAttribute("disabled");
  }

  currentPage = index;
  displayObjects(index, currentData.total, currentData.objectIDs);
}

/**
 * On click pagination (next).
 * If current page is not the last page, select next page
 */
function nextPage() {
  if (currentPage != numPages) {
    selectPage(currentPage + 1);
  }
}

/**
 * On click pagination (previous)
 * If current page is not the first page, select previous page
 */
function prevPage() {
  if (currentPage != 1) {
    selectPage(currentPage - 1);
  }
}

/**
 * get object data from API
 * @param {*} id objectID
 * @returns object data
 */
async function getObjectDetail(id) {
  let url = `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`;
  let response = await fetch(url, myHeaders);
  let data = await response.json();
  return data;
}

/**
 * Display object detail in modal.
 * Update modal elements with corresponding info.
 * @param {*} event 
 */
function displayObjectDetail(event) {
  // Button that triggered the modal
  const button = event.relatedTarget;
  // Extract info from data-bs-* attributes
  const objectId = button.getAttribute("data-bs-whatever");
  // Modal elements
  const modalTitle = detailModal.querySelector(".modal-title");
  const modalImages = detailModal.querySelector("#modal-images");
  const modalArtistName = detailModal.querySelector("#artist-name");
  const modalArtistRole = detailModal.querySelector("#artist-role");
  const modalDepartmentName = detailModal.querySelector("#department-name");
  const modalPeriod = detailModal.querySelector("#period");
  const modalCulture = detailModal.querySelector("#culture");
  const modalDate = detailModal.querySelector("#date");
  const modalMedium = detailModal.querySelector("#medium");
  const modalObjectName = detailModal.querySelector("#object-name");
  const modalBtn = detailModal.querySelector("#modal-btn");

  // Display spinner while loading
  modalImages.innerHTML =
    `<div class="d-flex justify-content-center align-items-center" style="height: 60vh;">
        <div class="spinner-border" style="width: 3rem; height: 3rem;" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    </div>`;

  // Get object detail data from API, then update modal elements 
  getObjectDetail(objectId).then((data) => {
    modalTitle.textContent = data.title;
    // Artist Info
    if (data.artistRole !== "" && data.artistDisplayName !== "") {
      modalArtistRole.innerHTML = `${data.artistRole}`;
      modalArtistName.innerHTML = `<strong>${data.artistDisplayName}.</strong> ${data.artistDisplayBio}`;
    } else {
      modalArtistRole.innerHTML = "Artist";
      modalArtistName.innerHTML = "Unknown";
    }
    // Department
    if (data.department !== "") {
      modalDepartmentName.innerHTML = `${data.department}`;
    } else {
      modalDepartmentName.innerHTML = "Unlisted";
    }
    // Object name/type 
    if (data.objectName !== "") {
      modalObjectName.innerHTML = `${data.objectName}`;
    } else {
      modalObjectName.innerHTML = "Unlisted";
    }
    // Medium
    if (data.medium !== "") {
      modalMedium.innerHTML = `${data.medium}`;
    } else {
      modalMedium.innerHTML = "Unlisted";
    }
    // Period
    if (data.period !== "") {
      modalPeriod.innerHTML = `${data.period}`;
    } else {
      modalPeriod.innerHTML = "Unlisted";
    }
    // Culture
    if (data.culture !== "") {
      modalCulture.innerHTML = `${data.culture}`;
    } else {
      modalCulture.innerHTML = "Unlisted";
    }
    // Date
    if (data.objectDate !== "") {
      modalDate.innerHTML = `${data.objectDate}`;
    } else {
      modalDate.innerHTML = "Unknown";
    }
    // Display image, or copyrighted.png if copyrighted. If broken link, handle error. 
    modalImages.innerHTML = `<img src=${data.primaryImageSmall !== ""
      ? data.primaryImageSmall
      : "img/copyrighted.png"
      } class="modal-img" alt="data.title" onerror="handleBrokenImage(event)">`;

    // Link to Met website opens in new tab
    modalBtn.innerHTML = `<a href=${data.objectURL} class="btn btn-primary mt-2" id="modal-btn" type="button" target="_blank" rel="noopener noreferrer">View on The Met website</button>`;
  });
}

// On page load

// Populate department selection input
getDepartments();

// Add Event Listeners
const searchBtn = document.querySelector("#search-btn");
searchBtn.addEventListener("click", search);

const randomBtn = document.querySelector("#random-btn");
randomBtn.addEventListener("click", getRandom);

// Bootstrap modal w/ object details
const detailModal = document.getElementById("detailModal");
detailModal.addEventListener("show.bs.modal", displayObjectDetail);
