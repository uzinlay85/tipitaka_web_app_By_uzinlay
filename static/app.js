/**
 * Tipitaka Pali & Myanmar Web Reader - Unified Controller
 */

// Application State
const state = {
    // Mode: 'pali' | 'mm' | 'split'
    readerMode: localStorage.getItem("tipitaka_reader_mode") || "pali",
    
    // Pali State
    paliBookId: "mula_vi_01",
    paliBookName: "ပါရာဇိကပါဠိ",
    paliPage: 1,
    paliFirstPage: 1,
    paliLastPage: 381,
    paliTocs: [],
    paliSuttas: [],
    paliRelated: [],
    matchingMM: null,

    // Myanmar State
    mmBookId: "01_vinaya_01",
    mmBookName: "ပါရာဇိကဏ်",
    mmPage: 1,
    mmFirstPage: 1,
    mmLastPage: 434,
    mmTocs: [],
    mmSuttas: [],
    matchingPali: null,

    // Shared collections
    paliCategories: [],
    mmCategories: [],
    bookmarks: [],
    activeTab: "tab-books",
    activeBasket: "mula",
    appView: localStorage.getItem("tipitaka_app_view") || "home",
    homeBasket: "mula",
    searchMode: "word",
    theme: localStorage.getItem("tipitaka_theme") || "paper",
    fontSize: parseInt(localStorage.getItem("tipitaka_font_size") || "100", 10),
    isDictOpen: window.innerWidth > 992 && (localStorage.getItem("tipitaka_dict_open") === "1"),
    isSidebarOpen: window.innerWidth > 992 && (localStorage.getItem("tipitaka_sidebar_open") !== "0"),
    showNotes: localStorage.getItem("tipitaka_show_notes") === "1",
    scrollMode: (function() {
        const m = localStorage.getItem("tipitaka_scroll_mode");
        if (m === "single") return "single";
        localStorage.setItem("tipitaka_scroll_mode", "feed");
        return "feed";
    })(),
    feedLoadedPages: new Set(),
    feedFirstLoadedPage: 1,
    feedLastLoadedPage: 1,
    isLoadingMore: false
};

// DOM Elements
const el = {
    appSidebar: document.getElementById("appSidebar"),
    dictSidebar: document.getElementById("dictSidebar"),
    btnToggleSidebar: document.getElementById("btnToggleSidebar"),
    btnToggleDict: document.getElementById("btnToggleDict"),
    btnCloseDict: document.getElementById("btnCloseDict"),
    
    // Mode Switcher & Tools
    btnModePali: document.getElementById("btnModePali"),
    btnModeMM: document.getElementById("btnModeMM"),
    btnModeSplit: document.getElementById("btnModeSplit"),
    btnCrossLink: document.getElementById("btnCrossLink"),
    crossLinkIcon: document.getElementById("crossLinkIcon"),
    crossLinkLabel: document.getElementById("crossLinkLabel"),
    btnToggleNotes: document.getElementById("btnToggleNotes"),
    toggleNotesLabel: document.getElementById("toggleNotesLabel"),
    btnToggleNotesMobile: document.getElementById("btnToggleNotesMobile"),
    toggleNotesLabelMobile: document.getElementById("toggleNotesLabelMobile"),
    mobileNotesRow: document.getElementById("mobileNotesRow"),
    scrollModeDropdownWrapper: document.getElementById("scrollModeDropdownWrapper"),
    btnScrollMode: document.getElementById("btnScrollMode"),
    scrollModeIcon: document.getElementById("scrollModeIcon"),
    scrollModeText: document.getElementById("scrollModeText"),
    pageScrollIndicator: document.getElementById("pageScrollIndicator"),
    pageScrollIndicatorText: document.getElementById("pageScrollIndicatorText"),
    scrollPageToast: document.getElementById("scrollPageToast"),
    scrollPageToastText: document.getElementById("scrollPageToastText"),
    loadPrevBox: document.getElementById("loadPrevBox"),
    btnLoadPrevPage: document.getElementById("btnLoadPrevPage"),
    loadPrevText: document.getElementById("loadPrevText"),
    infiniteSentinel: document.getElementById("infiniteSentinel"),
    sentinelLoading: document.getElementById("sentinelLoading"),
    sentinelEnd: document.getElementById("sentinelEnd"),
    metaEditionTag: document.getElementById("metaEditionTag"),
    paliBasketFilter: document.getElementById("paliBasketFilter"),

    // Header displays
    bookTitleDisplay: document.getElementById("bookTitleDisplay"),
    chapterTitleDisplay: document.getElementById("chapterTitleDisplay"),
    pageNumberInput: document.getElementById("pageNumberInput"),
    totalPageDisplay: document.getElementById("totalPageDisplay"),
    btnPrevPage: document.getElementById("btnPrevPage"),
    btnNextPage: document.getElementById("btnNextPage"),
    
    // Commentary dropdown
    relatedDropdownWrapper: document.getElementById("relatedDropdownWrapper"),
    btnRelated: document.getElementById("btnRelated"),
    relatedList: document.getElementById("relatedList"),
    
    // Bookmark
    btnBookmarkToggle: document.getElementById("btnBookmarkToggle"),
    bookmarkIcon: document.getElementById("bookmarkIcon"),
    
    // Font & Theme
    btnFontDec: document.getElementById("btnFontDec"),
    btnFontInc: document.getElementById("btnFontInc"),
    fontSizeDisplay: document.getElementById("fontSizeDisplay"),
    themeBtns: document.querySelectorAll(".theme-btn"),
    
    // Single Reading View
    readerContainer: document.getElementById("readerContainer"),
    readerPaper: document.getElementById("readerPaper"),
    paliContent: document.getElementById("paliContent"),
    metaBookName: document.getElementById("metaBookName"),
    metaPageNum: document.getElementById("metaPageNum"),
    btnFooterPrev: document.getElementById("btnFooterPrev"),
    btnFooterNext: document.getElementById("btnFooterNext"),
    footerCurrentPage: document.getElementById("footerCurrentPage"),
    footerTotalPage: document.getElementById("footerTotalPage"),
    
    // Split View
    splitViewContainer: document.getElementById("splitViewContainer"),
    splitPaliTitle: document.getElementById("splitPaliTitle"),
    splitPaliPage: document.getElementById("splitPaliPage"),
    splitPaliContent: document.getElementById("splitPaliContent"),
    splitMMTitle: document.getElementById("splitMMTitle"),
    splitMMPage: document.getElementById("splitMMPage"),
    splitMMContent: document.getElementById("splitMMContent"),

    // Sidebar Tabs
    sidebarTabBtns: document.querySelectorAll(".sidebar-tabs .tab-btn"),
    sidebarPanels: document.querySelectorAll(".sidebar-tab-panel"),
    basketBtns: document.querySelectorAll(".basket-btn"),
    booksFilterInput: document.getElementById("booksFilterInput"),
    booksTreeList: document.getElementById("booksTreeList"),
    tocFilterInput: document.getElementById("tocFilterInput"),
    tocList: document.getElementById("tocList"),
    suttaFilterInput: document.getElementById("suttaFilterInput"),
    suttaList: document.getElementById("suttaList"),
    bookmarksList: document.getElementById("bookmarksList"),
    
    // Dictionary
    dictSearchInput: document.getElementById("dictSearchInput"),
    btnDictSearch: document.getElementById("btnDictSearch"),
    dictContent: document.getElementById("dictContent"),
    
    // Search Modal
    searchModal: document.getElementById("searchModal"),
    btnOpenSearch: document.getElementById("btnOpenSearch"),
    btnCloseModal: document.getElementById("btnCloseModal"),
    globalSearchInput: document.getElementById("globalSearchInput"),
    btnClearSearch: document.getElementById("btnClearSearch"),
    modalTabBtns: document.querySelectorAll(".modal-tab-btn"),
    searchSummary: document.getElementById("searchSummary"),
    searchResultsList: document.getElementById("searchResultsList"),
    
    // Help / User Guide Modal
    helpModal: document.getElementById("helpModal"),
    btnOpenHelp: document.getElementById("btnOpenHelp"),
    btnCloseHelp: document.getElementById("btnCloseHelp"),

    // Quick Popover
    dictQuickPopover: document.getElementById("dictQuickPopover"),
    popoverWord: document.getElementById("popoverWord"),
    popoverBody: document.getElementById("popoverBody"),
    btnClosePopover: document.getElementById("btnClosePopover"),
    btnOpenInFullDict: document.getElementById("btnOpenInFullDict"),

    // Home Catalog & Bottom Nav (APK Style)
    btnGoHome: document.getElementById("btnGoHome"),
    homePage: document.getElementById("homePage"),
    homeAppTitle: document.getElementById("homeAppTitle"),
    homeBtnModeToggle: document.getElementById("homeBtnModeToggle"),
    homeModeToggleLabel: document.getElementById("homeModeToggleLabel"),
    homeBtnSearch: document.getElementById("homeBtnSearch"),
    homeBasketTabs: document.getElementById("homeBasketTabs"),
    homeCatalogInner: document.getElementById("homeCatalogInner"),
    btnFloatingSutta: document.getElementById("btnFloatingSutta"),
    bottomNavBar: document.getElementById("bottomNavBar"),
    btnNavHome: document.getElementById("btnNavHome"),
    btnNavReader: document.getElementById("btnNavReader"),
    btnNavRecent: document.getElementById("btnNavRecent"),
    btnNavDict: document.getElementById("btnNavDict"),
    btnNavMore: document.getElementById("btnNavMore")
};

// Initialize Application
async function initApp() {
    setupTheme(state.theme);
    setupFontSize(state.fontSize);
    setNotesVisibility(state.showNotes);
    setScrollMode(state.scrollMode);
    setupEventListeners();
    
    // Set view immediately so the page displays correctly right from the start
    setAppView(state.appView);

    if (!state.isSidebarOpen) el.appSidebar.classList.add("collapsed");
    if (!state.isDictOpen || state.appView === "home") el.dictSidebar.classList.add("collapsed");
    el.btnToggleDict.classList.toggle("active", state.isDictOpen && state.appView !== "home");
    
    await loadCategories();
    await loadBookmarks();

    if (state.appView === "reader") {
        await loadRecentOrFirst();
    } else {
        // Preload in background without stealing view focus
        loadRecentOrFirst();
    }
}

// ----------------- Categories & Initialization -----------------

async function loadCategories() {
    try {
        const resPali = await fetch("/api/categories");
        if (resPali.ok) {
            state.paliCategories = await resPali.json();
        }
    } catch (err) {
        console.error("Failed to load Pali categories:", err);
    }

    try {
        const resMM = await fetch("/api/mm/categories");
        if (resMM.ok) {
            state.mmCategories = await resMM.json();
        }
    } catch (err) {
        console.error("Failed to load MM categories:", err);
    }

    renderBooksTree();
    renderHomeCatalog();
}

async function loadRecentOrFirst() {
    try {
        const res = await fetch("/api/recent");
        const recent = await res.json();
        if (recent && recent.book_id) {
            await loadPaliBook(recent.book_id, recent.page_number || 1);
        } else {
            await loadPaliBook("mula_vi_01", 1);
        }
    } catch (err) {
        await loadPaliBook("mula_vi_01", 1);
    }
    setReaderMode(state.readerMode);
}

// ----------------- Mode Switcher (Pali / MM / Split) -----------------

function setReaderMode(mode) {
    state.readerMode = mode;
    localStorage.setItem("tipitaka_reader_mode", mode);

    el.btnModePali.classList.toggle("active", mode === "pali");
    el.btnModeMM.classList.toggle("active", mode === "mm");
    el.btnModeSplit.classList.toggle("active", mode === "split");

    document.querySelectorAll(".mobile-mode-btn").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-mode") === mode);
    });

    if (mode === "split") {
        el.readerPaper.style.display = "none";
        el.splitViewContainer.style.display = "flex";
        el.paliBasketFilter.style.display = "flex";
        el.metaEditionTag.textContent = "ယှဉ်တွဲဖတ်ရှုခြင်း";
        el.btnCrossLink.style.display = "none";
        if (el.btnToggleNotes) el.btnToggleNotes.style.display = "inline-flex";
        if (el.mobileNotesRow) el.mobileNotesRow.style.display = "block";
        el.relatedDropdownWrapper.style.display = "none";
        renderSplitView();
    } else if (mode === "mm") {
        el.readerPaper.style.display = "flex";
        el.splitViewContainer.style.display = "none";
        el.paliBasketFilter.style.display = "none";
        el.metaEditionTag.textContent = "မြန်မာပြန်";
        el.btnCrossLink.style.display = "inline-flex";
        if (el.crossLinkIcon) el.crossLinkIcon.textContent = "☸️";
        if (el.crossLinkLabel) el.crossLinkLabel.textContent = "ပါဠိတော်သို့";
        if (el.btnToggleNotes) el.btnToggleNotes.style.display = "none";
        if (el.mobileNotesRow) el.mobileNotesRow.style.display = "none";
        el.relatedDropdownWrapper.style.display = "none";
        loadMMBook(state.mmBookId, state.mmPage);
    } else { // 'pali'
        el.readerPaper.style.display = "flex";
        el.splitViewContainer.style.display = "none";
        el.paliBasketFilter.style.display = "flex";
        el.metaEditionTag.textContent = "ပါဠိတော်";
        el.btnCrossLink.style.display = "inline-flex";
        if (el.crossLinkIcon) el.crossLinkIcon.textContent = "🇲🇲";
        if (el.crossLinkLabel) el.crossLinkLabel.textContent = "မြန်မာပြန်သို့";
        if (el.btnToggleNotes) el.btnToggleNotes.style.display = "inline-flex";
        if (el.mobileNotesRow) el.mobileNotesRow.style.display = "block";
        loadPaliBook(state.paliBookId, state.paliPage);
    }
    renderBooksTree();
    renderHomeCatalog();
}

function handleCrossLink() {
    if (state.readerMode === "pali") {
        if (state.matchingMM) {
            state.mmBookId = state.matchingMM.book_id;
            state.mmPage = state.matchingMM.page;
        }
        setReaderMode("mm");
    } else {
        if (state.matchingPali) {
            state.paliBookId = state.matchingPali.book_id;
            state.paliPage = state.matchingPali.page;
        }
        setReaderMode("pali");
    }
}

// ----------------- Pali Reader -----------------

async function loadPaliBook(bookId, targetPage = 1) {
    if (state.paliBookId !== bookId || state.paliTocs.length === 0) {
        state.paliBookId = bookId;
        try {
            const res = await fetch(`/api/book/${bookId}`);
            const data = await res.json();
            state.paliBookName = data.book.name;
            state.paliFirstPage = data.book.firstpage;
            state.paliLastPage = data.book.lastpage;
            state.paliTocs = data.tocs || [];
            state.paliSuttas = data.suttas || [];
            state.paliRelated = data.related || [];
            
            renderTOC();
            renderSuttas();
            renderRelatedDropdown();
            highlightActiveBookInSidebar();
        } catch (err) {
            console.error("Failed to load pali book metadata:", err);
        }
    }
    await loadPaliPage(bookId, targetPage);
}

function cleanPaliContent(html) {
    if (!html) return "";
    return html.replace(/,(?![^<]*>)/g, "");
}

async function loadPaliPage(bookId, pageNum, highlightWord = null, isAppend = false, isPrepend = false) {
    pageNum = parseInt(pageNum, 10) || 1;
    state.paliBookId = bookId;
    
    if (!isAppend && !isPrepend && state.readerMode !== "split") {
        el.paliContent.innerHTML = `<div class="loading-state">စာမျက်နှာ ဖွင့်လှစ်နေပါသည်...</div>`;
        el.pageNumberInput.value = pageNum;
        if (el.loadPrevBox) el.loadPrevBox.style.display = "none";
        if (el.infiniteSentinel) el.infiniteSentinel.style.display = "none";
    }
    
    try {
        const res = await fetch(`/api/page/${bookId}/${pageNum}`);
        const data = await res.json();
        
        state.paliFirstPage = data.first_page;
        state.paliLastPage = data.last_page;
        state.matchingMM = data.matching_mm;
        
        if (state.readerMode === "pali") {
            let html = cleanPaliContent(data.content);
            if (highlightWord) {
                const regex = new RegExp(`(${highlightWord})`, "gi");
                html = html.replace(regex, `<mark class="hit">$1</mark>`);
            }

            if (state.scrollMode === "feed") {
                if (!isAppend && !isPrepend) {
                    state.paliPage = pageNum;
                    state.feedLoadedPages.clear();
                    state.feedLoadedPages.add(pageNum);
                    state.feedFirstLoadedPage = pageNum;
                    state.feedLastLoadedPage = pageNum;

                    el.bookTitleDisplay.textContent = data.book_name;
                    el.chapterTitleDisplay.textContent = data.chapter_name || "";
                    el.totalPageDisplay.textContent = data.last_page;
                    el.metaBookName.textContent = data.book_name;
                    el.metaPageNum.textContent = toMyanmarNum(data.page);
                    el.footerCurrentPage.textContent = toMyanmarNum(data.page);
                    el.footerTotalPage.textContent = toMyanmarNum(data.last_page);
                    el.pageNumberInput.value = pageNum;

                    el.btnPrevPage.disabled = !data.has_prev;
                    el.btnNextPage.disabled = !data.has_next;
                    el.btnFooterPrev.style.visibility = data.has_prev ? "visible" : "hidden";
                    el.btnFooterNext.style.visibility = data.has_next ? "visible" : "hidden";

                    el.paliContent.innerHTML = `
                        <section class="feed-page-item" id="pali-page-${pageNum}" data-page="${pageNum}">
                            ${html}
                        </section>
                    `;
                    el.readerContainer.scrollTop = 0;

                    if (el.loadPrevBox && el.loadPrevText) {
                        if (pageNum > data.first_page) {
                            el.loadPrevBox.style.display = "flex";
                            el.loadPrevText.textContent = `ယခင်စာမျက်နှာ (${toMyanmarNum(pageNum - 1)}) ကို ဆွဲယူရန်`;
                        } else {
                            el.loadPrevBox.style.display = "none";
                        }
                    }

                    if (el.infiniteSentinel) el.infiniteSentinel.style.display = "flex";
                    if (el.sentinelEnd) el.sentinelEnd.style.display = (pageNum >= data.last_page) ? "block" : "none";
                    if (el.sentinelLoading) el.sentinelLoading.style.display = "none";
                    if (el.pageScrollIndicator) el.pageScrollIndicator.style.display = "none";

                    setupSentinelObserver();
                    setupPageVisibilityObserver();
                    debounceRecent(bookId, pageNum);
                    updateBookmarkIconStatus();
                    highlightActiveToc(pageNum);
                } else if (isAppend) {
                    if (!state.feedLoadedPages.has(pageNum)) {
                        state.feedLoadedPages.add(pageNum);
                        state.feedLastLoadedPage = Math.max(state.feedLastLoadedPage, pageNum);

                        const div = document.createElement("div");
                        div.className = "page-divider";
                        div.setAttribute("data-page", pageNum);
                        div.innerHTML = `
                            <div class="divider-line"></div>
                            <div class="divider-badge">
                                <span class="badge-icon">📖</span>
                                <span class="badge-text">စာမျက်နှာ ${toMyanmarNum(pageNum)}</span>
                            </div>
                            <div class="divider-line"></div>
                        `;

                        const sec = document.createElement("section");
                        sec.className = "feed-page-item";
                        sec.id = `pali-page-${pageNum}`;
                        sec.setAttribute("data-page", pageNum);
                        sec.innerHTML = html;

                        el.paliContent.appendChild(div);
                        el.paliContent.appendChild(sec);

                        if (pageVisibilityObserver) pageVisibilityObserver.observe(sec);

                        if (pageNum >= data.last_page) {
                            if (el.sentinelEnd) el.sentinelEnd.style.display = "block";
                            if (el.sentinelLoading) el.sentinelLoading.style.display = "none";
                        }
                    }
                } else if (isPrepend) {
                    if (!state.feedLoadedPages.has(pageNum)) {
                        state.feedLoadedPages.add(pageNum);
                        state.feedFirstLoadedPage = Math.min(state.feedFirstLoadedPage, pageNum);

                        const div = document.createElement("div");
                        div.className = "page-divider";
                        div.setAttribute("data-page", pageNum + 1);
                        div.innerHTML = `
                            <div class="divider-line"></div>
                            <div class="divider-badge">
                                <span class="badge-icon">📖</span>
                                <span class="badge-text">စာမျက်နှာ ${toMyanmarNum(pageNum + 1)}</span>
                            </div>
                            <div class="divider-line"></div>
                        `;

                        const sec = document.createElement("section");
                        sec.className = "feed-page-item";
                        sec.id = `pali-page-${pageNum}`;
                        sec.setAttribute("data-page", pageNum);
                        sec.innerHTML = html;

                        const oldScrollHeight = el.readerContainer.scrollHeight;
                        const oldScrollTop = el.readerContainer.scrollTop;

                        el.paliContent.insertBefore(div, el.paliContent.firstChild);
                        el.paliContent.insertBefore(sec, div);

                        const heightAdded = el.readerContainer.scrollHeight - oldScrollHeight;
                        el.readerContainer.scrollTop = oldScrollTop + heightAdded;

                        if (pageVisibilityObserver) pageVisibilityObserver.observe(sec);

                        if (el.loadPrevBox && el.loadPrevText) {
                            if (pageNum > data.first_page) {
                                el.loadPrevBox.style.display = "flex";
                                el.loadPrevText.textContent = `ယခင်စာမျက်နှာ (${toMyanmarNum(pageNum - 1)}) ကို ဆွဲယူရန်`;
                            } else {
                                el.loadPrevBox.style.display = "none";
                            }
                        }
                    }
                }
            } else {
                // Single page mode
                state.paliPage = pageNum;
                el.bookTitleDisplay.textContent = data.book_name;
                el.chapterTitleDisplay.textContent = data.chapter_name || "";
                el.totalPageDisplay.textContent = data.last_page;
                el.metaBookName.textContent = data.book_name;
                el.metaPageNum.textContent = toMyanmarNum(data.page);
                el.footerCurrentPage.textContent = toMyanmarNum(data.page);
                el.footerTotalPage.textContent = toMyanmarNum(data.last_page);
                el.pageNumberInput.value = pageNum;
                
                el.btnPrevPage.disabled = !data.has_prev;
                el.btnNextPage.disabled = !data.has_next;
                el.btnFooterPrev.style.visibility = data.has_prev ? "visible" : "hidden";
                el.btnFooterNext.style.visibility = data.has_next ? "visible" : "hidden";
                
                el.paliContent.innerHTML = html;
                el.readerContainer.scrollTop = 0;
                
                if (el.loadPrevBox) el.loadPrevBox.style.display = "none";
                if (el.infiniteSentinel) el.infiniteSentinel.style.display = "none";
                updateScrollIndicator(data.page, data.last_page);
                
                debounceRecent(bookId, pageNum);
                updateBookmarkIconStatus();
                highlightActiveToc(pageNum);
            }
        }

        // Update split view if open
        if (state.readerMode === "split") {
            el.splitPaliTitle.textContent = data.book_name;
            el.splitPaliPage.textContent = toMyanmarNum(data.page);
            el.splitPaliContent.innerHTML = cleanPaliContent(data.content);
            
            // Sync matching MM page
            if (data.matching_mm) {
                state.mmBookId = data.matching_mm.book_id;
                state.mmPage = data.matching_mm.page;
                await loadMMPage(data.matching_mm.book_id, data.matching_mm.page, true);
            }
        }

    } catch (err) {
        console.error("Failed to load pali page:", err);
    }
}

// ----------------- Myanmar Translation Reader -----------------

async function loadMMBook(bookId, targetPage = 1) {
    if (state.mmBookId !== bookId || state.mmTocs.length === 0) {
        state.mmBookId = bookId;
        try {
            const res = await fetch(`/api/mm/book/${bookId}`);
            const data = await res.json();
            state.mmBookName = data.book.name;
            state.mmFirstPage = data.book.first_page;
            state.mmLastPage = data.book.last_page;
            state.mmTocs = data.tocs || [];
            state.mmSuttas = data.suttas || [];
            
            renderTOC();
            renderSuttas();
            highlightActiveBookInSidebar();
        } catch (err) {
            console.error("Failed to load mm book metadata:", err);
        }
    }
    await loadMMPage(bookId, targetPage);
}

async function loadMMPage(bookId, pageNum, isSplitRightPane = false, isAppend = false, isPrepend = false) {
    pageNum = parseInt(pageNum, 10) || 1;
    state.mmBookId = bookId;

    if (!isSplitRightPane && !isAppend && !isPrepend && state.readerMode === "mm") {
        el.paliContent.innerHTML = `<div class="loading-state">မြန်မာပြန် စာမျက်နှာ ဖွင့်လှစ်နေပါသည်...</div>`;
        el.pageNumberInput.value = pageNum;
        if (el.loadPrevBox) el.loadPrevBox.style.display = "none";
        if (el.infiniteSentinel) el.infiniteSentinel.style.display = "none";
    }

    try {
        const res = await fetch(`/api/mm/page/${bookId}/${pageNum}`);
        const data = await res.json();

        state.mmFirstPage = data.first_page;
        state.mmLastPage = data.last_page;
        state.matchingPali = data.matching_pali;

        if (state.readerMode === "mm" && !isSplitRightPane) {
            if (state.scrollMode === "feed") {
                if (!isAppend && !isPrepend) {
                    state.mmPage = pageNum;
                    state.feedLoadedPages.clear();
                    state.feedLoadedPages.add(pageNum);
                    state.feedFirstLoadedPage = pageNum;
                    state.feedLastLoadedPage = pageNum;

                    el.bookTitleDisplay.textContent = data.book_name;
                    el.chapterTitleDisplay.textContent = data.chapter_name || "";
                    el.totalPageDisplay.textContent = data.last_page;
                    el.metaBookName.textContent = data.book_name;
                    el.metaPageNum.textContent = toMyanmarNum(data.page);
                    el.footerCurrentPage.textContent = toMyanmarNum(data.page);
                    el.footerTotalPage.textContent = toMyanmarNum(data.last_page);
                    el.pageNumberInput.value = pageNum;

                    el.btnPrevPage.disabled = !data.has_prev;
                    el.btnNextPage.disabled = !data.has_next;
                    el.btnFooterPrev.style.visibility = data.has_prev ? "visible" : "hidden";
                    el.btnFooterNext.style.visibility = data.has_next ? "visible" : "hidden";

                    el.paliContent.innerHTML = `
                        <section class="feed-page-item" id="mm-page-${pageNum}" data-page="${pageNum}">
                            ${data.content}
                        </section>
                    `;
                    el.readerContainer.scrollTop = 0;

                    if (el.loadPrevBox && el.loadPrevText) {
                        if (pageNum > data.first_page) {
                            el.loadPrevBox.style.display = "flex";
                            el.loadPrevText.textContent = `ယခင်စာမျက်နှာ (${toMyanmarNum(pageNum - 1)}) ကို ဆွဲယူရန်`;
                        } else {
                            el.loadPrevBox.style.display = "none";
                        }
                    }

                    if (el.infiniteSentinel) el.infiniteSentinel.style.display = "flex";
                    if (el.sentinelEnd) el.sentinelEnd.style.display = (pageNum >= data.last_page) ? "block" : "none";
                    if (el.sentinelLoading) el.sentinelLoading.style.display = "none";
                    if (el.pageScrollIndicator) el.pageScrollIndicator.style.display = "none";

                    setupSentinelObserver();
                    setupPageVisibilityObserver();
                    highlightActiveToc(pageNum);
                } else if (isAppend) {
                    if (!state.feedLoadedPages.has(pageNum)) {
                        state.feedLoadedPages.add(pageNum);
                        state.feedLastLoadedPage = Math.max(state.feedLastLoadedPage, pageNum);

                        const div = document.createElement("div");
                        div.className = "page-divider";
                        div.setAttribute("data-page", pageNum);
                        div.innerHTML = `
                            <div class="divider-line"></div>
                            <div class="divider-badge">
                                <span class="badge-icon">📖</span>
                                <span class="badge-text">စာမျက်နှာ ${toMyanmarNum(pageNum)}</span>
                            </div>
                            <div class="divider-line"></div>
                        `;

                        const sec = document.createElement("section");
                        sec.className = "feed-page-item";
                        sec.id = `mm-page-${pageNum}`;
                        sec.setAttribute("data-page", pageNum);
                        sec.innerHTML = data.content;

                        el.paliContent.appendChild(div);
                        el.paliContent.appendChild(sec);

                        if (pageVisibilityObserver) pageVisibilityObserver.observe(sec);

                        if (pageNum >= data.last_page) {
                            if (el.sentinelEnd) el.sentinelEnd.style.display = "block";
                            if (el.sentinelLoading) el.sentinelLoading.style.display = "none";
                        }
                    }
                } else if (isPrepend) {
                    if (!state.feedLoadedPages.has(pageNum)) {
                        state.feedLoadedPages.add(pageNum);
                        state.feedFirstLoadedPage = Math.min(state.feedFirstLoadedPage, pageNum);

                        const div = document.createElement("div");
                        div.className = "page-divider";
                        div.setAttribute("data-page", pageNum + 1);
                        div.innerHTML = `
                            <div class="divider-line"></div>
                            <div class="divider-badge">
                                <span class="badge-icon">📖</span>
                                <span class="badge-text">စာမျက်နှာ ${toMyanmarNum(pageNum + 1)}</span>
                            </div>
                            <div class="divider-line"></div>
                        `;

                        const sec = document.createElement("section");
                        sec.className = "feed-page-item";
                        sec.id = `mm-page-${pageNum}`;
                        sec.setAttribute("data-page", pageNum);
                        sec.innerHTML = data.content;

                        const oldScrollHeight = el.readerContainer.scrollHeight;
                        const oldScrollTop = el.readerContainer.scrollTop;

                        el.paliContent.insertBefore(div, el.paliContent.firstChild);
                        el.paliContent.insertBefore(sec, div);

                        const heightAdded = el.readerContainer.scrollHeight - oldScrollHeight;
                        el.readerContainer.scrollTop = oldScrollTop + heightAdded;

                        if (pageVisibilityObserver) pageVisibilityObserver.observe(sec);

                        if (el.loadPrevBox && el.loadPrevText) {
                            if (pageNum > data.first_page) {
                                el.loadPrevBox.style.display = "flex";
                                el.loadPrevText.textContent = `ယခင်စာမျက်နှာ (${toMyanmarNum(pageNum - 1)}) ကို ဆွဲယူရန်`;
                            } else {
                                el.loadPrevBox.style.display = "none";
                            }
                        }
                    }
                }
            } else {
                // Single page mode
                state.mmPage = pageNum;
                el.bookTitleDisplay.textContent = data.book_name;
                el.chapterTitleDisplay.textContent = data.chapter_name || "";
                el.totalPageDisplay.textContent = data.last_page;
                el.metaBookName.textContent = data.book_name;
                el.metaPageNum.textContent = toMyanmarNum(data.page);
                el.footerCurrentPage.textContent = toMyanmarNum(data.page);
                el.footerTotalPage.textContent = toMyanmarNum(data.last_page);
                el.pageNumberInput.value = pageNum;

                el.btnPrevPage.disabled = !data.has_prev;
                el.btnNextPage.disabled = !data.has_next;
                el.btnFooterPrev.style.visibility = data.has_prev ? "visible" : "hidden";
                el.btnFooterNext.style.visibility = data.has_next ? "visible" : "hidden";

                el.paliContent.innerHTML = data.content;
                el.readerContainer.scrollTop = 0;
                
                if (el.loadPrevBox) el.loadPrevBox.style.display = "none";
                if (el.infiniteSentinel) el.infiniteSentinel.style.display = "none";
                updateScrollIndicator(data.page, data.last_page);

                highlightActiveToc(pageNum);
            }
        }

        if (isSplitRightPane || state.readerMode === "split") {
            el.splitMMTitle.textContent = data.book_name;
            el.splitMMPage.textContent = toMyanmarNum(data.page);
            el.splitMMContent.innerHTML = data.content;
        }

    } catch (err) {
        console.error("Failed to load mm page:", err);
    }
}

// ----------------- Split View Logic -----------------

async function renderSplitView() {
    el.bookTitleDisplay.textContent = `${state.paliBookName} ↔ ${state.mmBookName}`;
    el.chapterTitleDisplay.textContent = "ပါဠိတော်နှင့် မြန်မာပြန် ယှဉ်တွဲဖတ်ရှုခြင်း";
    el.pageNumberInput.value = state.paliPage;
    el.totalPageDisplay.textContent = state.paliLastPage;
    await loadPaliPage(state.paliBookId, state.paliPage);
}

// ----------------- Category & Catalog Helpers (APK Style) -----------------

function getCleanCategoryName(catName, catId) {
    const map = {
        'vi': 'ဝိနယပိဋက',
        'di': 'ဒီဃနိကာယ',
        'ma': 'မဇ္ဈိမနိကာယ',
        'sa': 'သံယုတ္တနိကာယ',
        'an': 'အင်္ဂုတ္တရနိကာယ',
        'ku': 'ခုဒ္ဒကနိကာယ',
        'bi': 'အဘိဓမ္မပိဋက',
        'annya_vi': 'ဝိနယ',
        'annya_bi': 'အဘိဓမ္မ',
        'annya_sadda': 'ဗျာကရဏာဒိ'
    };
    if (catId && map[catId]) return map[catId];
    if (!catName) return "";
    return catName.replace(/\(.*?\)/g, "").trim() || catName;
}

// ----------------- App View Controller (Home vs Reader) -----------------

function setAppView(view) {
    state.appView = view;
    localStorage.setItem("tipitaka_app_view", view);

    const isHome = (view === "home");
    
    if (isHome) {
        document.body.classList.add("view-home");
        document.body.classList.remove("view-reader");
        if (el.homePage) el.homePage.style.display = "flex";
        if (el.readerContainer) el.readerContainer.style.display = "none";
        if (el.splitViewContainer) el.splitViewContainer.style.display = "none";
        if (el.appSidebar) el.appSidebar.classList.add("collapsed");
        if (el.dictSidebar) el.dictSidebar.classList.add("collapsed");
        renderHomeCatalog();
    } else {
        document.body.classList.remove("view-home");
        document.body.classList.add("view-reader");
        if (el.homePage) el.homePage.style.display = "none";
        if (state.readerMode === "split") {
            if (el.splitViewContainer) el.splitViewContainer.style.display = "flex";
            if (el.readerPaper) el.readerPaper.style.display = "none";
        } else {
            if (el.readerContainer) el.readerContainer.style.display = "flex";
            if (el.readerPaper) el.readerPaper.style.display = "flex";
        }
    }

    // Update bottom navigation bar active states
    if (el.btnNavHome) el.btnNavHome.classList.toggle("active", isHome);
    if (el.btnNavReader) el.btnNavReader.classList.toggle("active", !isHome);
    if (el.btnNavRecent) el.btnNavRecent.classList.remove("active");
    if (el.btnNavDict) el.btnNavDict.classList.toggle("active", state.isDictOpen);
    if (el.btnNavMore) el.btnNavMore.classList.toggle("active", state.isSidebarOpen);
}

// ----------------- Home Page Catalog (APK Style) -----------------

async function renderHomeCatalog() {
    if (!el.homeCatalogInner) return;
    const isPali = (state.readerMode !== "mm");
    const basket = state.homeBasket || "mula";

    // Update Title and Mode Toggle Label
    if (el.homeAppTitle) {
        el.homeAppTitle.textContent = isPali ? "တိပိဋကပါဠိ" : "တိပိဋကမြန်မာပြန်";
    }
    if (el.homeModeToggleLabel) {
        el.homeModeToggleLabel.textContent = isPali ? "🇲🇲 မြန်မာပြန်သို့" : "☸️ ပါဠိတော်သို့";
    }

    // Basket Tabs for Pali (ပါဠိ, အဋ္ဌကထာ, ဋီကာ, အည)
    if (el.homeBasketTabs) {
        if (isPali) {
            el.homeBasketTabs.style.display = "flex";
            el.homeBasketTabs.querySelectorAll(".home-basket-tab").forEach(tab => {
                tab.classList.toggle("active", tab.getAttribute("data-basket") === basket);
            });
        } else {
            el.homeBasketTabs.style.display = "none";
        }
    }

    // Auto-fetch if categories not ready
    if (isPali && (!state.paliCategories || state.paliCategories.length === 0)) {
        try {
            const res = await fetch("/api/categories");
            if (res.ok) state.paliCategories = await res.json();
        } catch (e) {
            console.error("Auto fetch categories failed:", e);
        }
    } else if (!isPali && (!state.mmCategories || state.mmCategories.length === 0)) {
        try {
            const res = await fetch("/api/mm/categories");
            if (res.ok) state.mmCategories = await res.json();
        } catch (e) {
            console.error("Auto fetch MM categories failed:", e);
        }
    }

    let html = "";
    if (isPali && state.paliCategories && state.paliCategories.length > 0) {
        state.paliCategories.forEach(cat => {
            const cleanCatName = getCleanCategoryName(cat.name, cat.id);
            const books = (cat.books || []).filter(b => b.basket === basket);
            if (books.length > 0) {
                html += `
                    <div class="home-cat-section">
                        <div class="home-cat-header">${cleanCatName}</div>
                        <div class="home-book-list">
                `;
                books.forEach(b => {
                    html += `
                        <button class="home-book-row" data-id="${b.id}" data-name="${b.name}">
                            <span class="home-book-name">${b.name}</span>
                        </button>
                    `;
                });
                html += `
                        </div>
                    </div>
                `;
            }
        });
    } else if (!isPali && state.mmCategories && state.mmCategories.length > 0) {
        // Myanmar translations catalog (60 books)
        state.mmCategories.forEach(cat => {
            const cleanCatName = getCleanCategoryName(cat.name, cat.id);
            if (cat.books && cat.books.length > 0) {
                html += `
                    <div class="home-cat-section">
                        <div class="home-cat-header">${cleanCatName}</div>
                        <div class="home-book-list">
                `;
                cat.books.forEach(b => {
                    html += `
                        <button class="home-book-row" data-id="${b.id}" data-name="${b.name}">
                            <span class="home-book-name">${b.name}</span>
                        </button>
                    `;
                });
                html += `
                        </div>
                    </div>
                `;
            }
        });
    }

    el.homeCatalogInner.innerHTML = html || `
        <div class="empty-state" style="padding: 40px 16px; text-align: center;">
            <p>ကျမ်းစာအုပ်များ စာရင်းဆွဲယူနေပါသည်...</p>
            <button class="tool-btn" style="margin-top: 10px;" onclick="loadCategories()">ပြန်လည်ဆွဲယူရန် (Reload)</button>
        </div>
    `;

    // Book row click listener: open book & transition to reader
    el.homeCatalogInner.querySelectorAll(".home-book-row").forEach(row => {
        row.addEventListener("click", () => {
            const bId = row.getAttribute("data-id");
            if (state.readerMode === "mm") {
                loadMMBook(bId, 1);
            } else {
                loadPaliBook(bId, 1);
            }
            setAppView("reader");
        });
    });
}

// ----------------- Sidebar Rendering -----------------

function renderBooksTree() {
    const filterText = (el.booksFilterInput.value || "").trim().toLowerCase();
    let html = "";

    if (state.readerMode === "mm") {
        // Render Myanmar 60 Books
        state.mmCategories.forEach(cat => {
            const cleanCatName = getCleanCategoryName(cat.name, cat.id);
            const filtered = cat.books.filter(b => !filterText || b.name.toLowerCase().includes(filterText));
            if (filtered.length > 0) {
                html += `<div class="category-group">
                    <div class="category-header">${cleanCatName}</div>`;
                filtered.forEach(b => {
                    const isActive = (b.id === state.mmBookId);
                    html += `
                        <button class="book-item-btn ${isActive ? 'active' : ''}" data-id="${b.id}" data-name="${b.name}">
                            <span class="book-name-text">${b.name}</span>
                            <span class="book-pages-badge">${b.page_count} မျက်နှာ</span>
                        </button>
                    `;
                });
                html += `</div>`;
            }
        });
    } else {
        // Render Pali Books
        const basket = state.activeBasket;
        state.paliCategories.forEach(cat => {
            const cleanCatName = getCleanCategoryName(cat.name, cat.id);
            const filtered = cat.books.filter(b => {
                const matchesBasket = (basket === "all" || b.basket === basket);
                const matchesText = !filterText || b.name.toLowerCase().includes(filterText) || (b.short_name && b.short_name.toLowerCase().includes(filterText));
                return matchesBasket && matchesText;
            });
            if (filtered.length > 0) {
                html += `<div class="category-group">
                    <div class="category-header">${cleanCatName}</div>`;
                filtered.forEach(b => {
                    const isActive = (b.id === state.paliBookId);
                    html += `
                        <button class="book-item-btn ${isActive ? 'active' : ''}" data-id="${b.id}" data-name="${b.name}">
                            <span class="book-name-text">${b.name}</span>
                            <span class="book-pages-badge">${b.pagecount} မျက်နှာ</span>
                        </button>
                    `;
                });
                html += `</div>`;
            }
        });
    }

    el.booksTreeList.innerHTML = html || `<div class="empty-state">ကိုက်ညီသော ကျမ်းစာအုပ် မရှိပါ။</div>`;

    el.booksTreeList.querySelectorAll(".book-item-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const bId = btn.getAttribute("data-id");
            if (state.readerMode === "mm") {
                loadMMBook(bId, 1);
            } else {
                loadPaliBook(bId, 1);
            }
            setAppView("reader");
            closeSidebarMobile();
        });
    });
}

function highlightActiveBookInSidebar() {
    const curId = (state.readerMode === "mm") ? state.mmBookId : state.paliBookId;
    el.booksTreeList.querySelectorAll(".book-item-btn").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-id") === curId);
    });
}

function renderTOC() {
    const filter = (el.tocFilterInput.value || "").trim().toLowerCase();
    const tocs = (state.readerMode === "mm") ? state.mmTocs : state.paliTocs;
    const filtered = tocs.filter(t => !filter || t.name.toLowerCase().includes(filter));

    if (filtered.length === 0) {
        el.tocList.innerHTML = `<div class="empty-state">မာတိကာ အချက်အလက် မရှိပါ။</div>`;
        return;
    }

    let html = "";
    filtered.forEach(t => {
        html += `
            <button class="toc-item-btn type-${t.type || 'item'}" data-page="${t.page_number}">
                <span>${t.name}</span>
                <span class="item-page-badge">စာ-${t.page_number}</span>
            </button>
        `;
    });
    el.tocList.innerHTML = html;

    el.tocList.querySelectorAll(".toc-item-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const p = parseInt(btn.getAttribute("data-page"), 10);
            if (state.readerMode === "mm") {
                loadMMPage(state.mmBookId, p);
            } else {
                loadPaliPage(state.paliBookId, p);
            }
            closeSidebarMobile();
        });
    });
}

function highlightActiveToc(currentPg) {
    let activeBtn = null;
    el.tocList.querySelectorAll(".toc-item-btn").forEach(btn => {
        const p = parseInt(btn.getAttribute("data-page"), 10);
        btn.classList.remove("active");
        if (p <= currentPg) activeBtn = btn;
    });
    if (activeBtn) activeBtn.classList.add("active");
}

function renderSuttas() {
    const filter = (el.suttaFilterInput.value || "").trim().toLowerCase();
    const suttas = (state.readerMode === "mm") ? state.mmSuttas : state.paliSuttas;
    const filtered = suttas.filter(s => !filter || s.name.toLowerCase().includes(filter) || (s.sutta_id && s.sutta_id.toLowerCase().includes(filter)));

    if (filtered.length === 0) {
        el.suttaList.innerHTML = `<div class="empty-state">ဤကျမ်းတွင် သုတ္တန်ခွဲများ မရှိပါ။</div>`;
        return;
    }

    let html = "";
    filtered.forEach(s => {
        html += `
            <button class="sutta-item-btn" data-page="${s.page_number}">
                <span>${s.name} ${s.sutta_id ? `(${s.sutta_id})` : ''}</span>
                <span class="item-page-badge">စာ-${s.page_number}</span>
            </button>
        `;
    });
    el.suttaList.innerHTML = html;

    el.suttaList.querySelectorAll(".sutta-item-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const p = parseInt(btn.getAttribute("data-page"), 10);
            if (state.readerMode === "mm") {
                loadMMPage(state.mmBookId, p);
            } else {
                loadPaliPage(state.paliBookId, p);
            }
            closeSidebarMobile();
        });
    });
}

function renderRelatedDropdown() {
    if (!state.paliRelated || state.paliRelated.length === 0) {
        el.relatedDropdownWrapper.style.display = "none";
        return;
    }
    el.relatedDropdownWrapper.style.display = "block";
    let html = "";
    state.paliRelated.forEach(r => {
        const label = r.rel_type === "root" ? "ပါဠိတော်မူလ" : "အဋ္ဌကထာ/ဋီကာ";
        html += `
            <button class="dropdown-item" data-id="${r.id}">
                <div><strong>${r.name}</strong></div>
                <small style="color:var(--text-muted);">${label}</small>
            </button>
        `;
    });
    el.relatedList.innerHTML = html;

    el.relatedList.querySelectorAll(".dropdown-item").forEach(btn => {
        btn.addEventListener("click", () => {
            const relId = btn.getAttribute("data-id");
            el.relatedDropdownWrapper.classList.remove("open");
            loadPaliBook(relId, 1);
        });
    });
}

// ----------------- Bookmarks -----------------

async function loadBookmarks() {
    try {
        const res = await fetch("/api/bookmarks");
        state.bookmarks = await res.json();
        renderBookmarksList();
        updateBookmarkIconStatus();
    } catch (err) {
        console.error("Failed to load bookmarks:", err);
    }
}

function renderBookmarksList() {
    if (!state.bookmarks || state.bookmarks.length === 0) {
        el.bookmarksList.innerHTML = `<div class="empty-state">မှတ်သားထားသော စာမျက်နှာ မရှိသေးပါ။</div>`;
        return;
    }
    let html = "";
    state.bookmarks.forEach(bm => {
        html += `
            <div class="bookmark-item-btn" data-id="${bm.book_id}" data-page="${bm.page_number}">
                <div style="flex:1;">
                    <strong>${bm.book_name || bm.book_id}</strong>
                    <div style="font-size:0.8rem;color:var(--text-secondary);">စာမျက်နှာ - ${bm.page_number}</div>
                    ${bm.note ? `<div style="font-size:0.75rem;color:var(--text-muted);">${bm.note}</div>` : ''}
                </div>
                <button class="icon-btn-sm btn-delete-bm" data-id="${bm.book_id}" data-page="${bm.page_number}" title="ဖျက်ရန်">&times;</button>
            </div>
        `;
    });
    el.bookmarksList.innerHTML = html;

    el.bookmarksList.querySelectorAll(".bookmark-item-btn").forEach(item => {
        item.addEventListener("click", (e) => {
            if (e.target.classList.contains("btn-delete-bm")) return;
            const bid = item.getAttribute("data-id");
            const page = parseInt(item.getAttribute("data-page"), 10);
            loadPaliBook(bid, page);
            closeSidebarMobile();
        });
    });

    el.bookmarksList.querySelectorAll(".btn-delete-bm").forEach(delBtn => {
        delBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const bid = delBtn.getAttribute("data-id");
            const page = parseInt(delBtn.getAttribute("data-page"), 10);
            await fetch("/api/bookmarks", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ book_id: bid, page_number: page })
            });
            await loadBookmarks();
        });
    });
}

function updateBookmarkIconStatus() {
    const isBookmarked = state.bookmarks.some(b => b.book_id === state.paliBookId && b.page_number === state.paliPage);
    if (isBookmarked) {
        el.bookmarkIcon.setAttribute("fill", "currentColor");
        el.btnBookmarkToggle.style.color = "var(--accent)";
    } else {
        el.bookmarkIcon.setAttribute("fill", "none");
        el.btnBookmarkToggle.style.color = "";
    }
}

async function toggleCurrentBookmark() {
    const isBookmarked = state.bookmarks.some(b => b.book_id === state.paliBookId && b.page_number === state.paliPage);
    if (isBookmarked) {
        await fetch("/api/bookmarks", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ book_id: state.paliBookId, page_number: state.paliPage })
        });
    } else {
        await fetch("/api/bookmarks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ book_id: state.paliBookId, page_number: state.paliPage, note: "" })
        });
    }
    await loadBookmarks();
}

// ----------------- Interactive Dictionary -----------------

async function lookupDictionary(word, triggerPopover = false, clickX = 0, clickY = 0) {
    if (!word) return;
    if (!state.isDictOpen && !triggerPopover) toggleDictSidebar(true);

    el.dictContent.innerHTML = `
        <div class="loading-state">
            <div>အဘိဓာန် ရှာဖွေနေပါသည်...</div>
            <strong style="color:var(--accent); font-size:1.1rem; margin-top:8px; display:inline-block;">${word}</strong>
        </div>
    `;

    try {
        const res = await fetch(`/api/dictionary/lookup?word=${encodeURIComponent(word)}`);
        const data = await res.json();

        if (!data.results || data.results.length === 0) {
            el.dictContent.innerHTML = `
                <div class="dict-result-header">
                    <div class="dict-result-word">${data.clean_word || word}</div>
                </div>
                <div class="empty-state">ဤစကားလုံးအတွက် အဘိဓာန် အဓိပ္ပာယ် မတွေ့ရှိပါ။</div>
            `;
            return;
        }

        const isStemmed = data.clean_word !== data.matched_word;
        let html = `
            <div class="dict-result-header">
                <div class="dict-result-word">${data.matched_word}</div>
                ${isStemmed ? `<div class="dict-stem-hint">မူလစာလုံး '${data.clean_word}' မှ ဝိဘတ်ဖြုတ်၍ တွေ့ရှိသောအနက်</div>` : ''}
            </div>
        `;

        data.results.forEach(item => {
            html += `
                <div class="dict-entry-card">
                    <span class="dict-book-badge">${item.book_name}</span>
                    <div class="dict-def-body">${item.definition}</div>
                </div>
            `;
        });

        el.dictContent.innerHTML = html;
        el.dictSearchInput.value = data.clean_word;

        if (triggerPopover) {
            showQuickPopover(data.matched_word, data.results[0].definition, clickX, clickY);
        }

    } catch (err) {
        console.error("Dict lookup error:", err);
        el.dictContent.innerHTML = `<div class="empty-state">အဘိဓာန် ရှာဖွေရာတွင် အမှားဖြစ်ပေါ်ပါသည်- ${err.message}</div>`;
    }
}

function showQuickPopover(word, defHtml, x, y) {
    el.popoverWord.textContent = word;
    el.popoverBody.innerHTML = defHtml;
    const pop = el.dictQuickPopover;
    pop.style.display = "block";
    if (window.innerWidth > 768) {
        const popWidth = 280;
        const popHeight = 180;
        let left = x - 50;
        let top = y + 20;
        if (left + popWidth > window.innerWidth) left = window.innerWidth - popWidth - 16;
        if (left < 10) left = 10;
        if (top + popHeight > window.innerHeight) top = y - popHeight - 10;
        pop.style.left = `${left}px`;
        pop.style.top = `${top}px`;
    } else {
        pop.style.left = "";
        pop.style.top = "";
    }
}

// ----------------- Universal Search -----------------

let searchDebounceTimer = null;

async function performSearch() {
    const q = el.globalSearchInput.value.trim();
    if (!q) {
        el.searchResultsList.innerHTML = `<div class="search-hint"><p>💡 ရှာဖွေလိုသော စာလုံး ရိုက်ထည့်ပါ...</p></div>`;
        el.searchSummary.style.display = "none";
        return;
    }

    el.searchResultsList.innerHTML = `<div class="loading-state">ရှာဖွေနေပါသည်...</div>`;
    el.searchSummary.style.display = "none";

    try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${state.searchMode}&limit=30`);
        const data = await res.json();

        if (data.total === 0 || !data.results || data.results.length === 0) {
            el.searchResultsList.innerHTML = `<div class="empty-state">ရှာဖွေမှုရလဒ် မတွေ့ရှိပါ။</div>`;
            return;
        }

        el.searchSummary.style.display = "block";
        if (state.searchMode === "word") {
            el.searchSummary.innerHTML = `တွေ့ရှိမှု စုစုပေါင်း <strong>${data.total_occurrences.toLocaleString()}</strong> ကြိမ် (စာမျက်နှာ <strong>${data.total.toLocaleString()}</strong> မျက်နှာ)`;
        } else {
            el.searchSummary.innerHTML = `တွေ့ရှိမှု စုစုပေါင်း <strong>${data.total.toLocaleString()}</strong> ခု`;
        }

        let html = "";
        data.results.forEach(r => {
            if (state.searchMode === "word") {
                html += `
                    <div class="search-result-item" data-type="pali" data-bid="${r.book_id}" data-page="${r.page}">
                        <div class="res-header">
                            <span class="res-book">${r.book_name}</span>
                            <span class="res-page">စာမျက်နှာ - ${r.page}</span>
                        </div>
                        <div class="res-snippet">${r.snippet}</div>
                    </div>
                `;
            } else if (state.searchMode === "sutta") {
                html += `
                    <div class="search-result-item" data-type="pali" data-bid="${r.book_id}" data-page="${r.page_number}">
                        <div class="res-header">
                            <span class="res-book">${r.name} ${r.sutta_id ? `(${r.sutta_id})` : ''}</span>
                            <span class="res-page">${r.book_name} • စာ-${r.page_number}</span>
                        </div>
                    </div>
                `;
            } else if (state.searchMode === "book") {
                html += `
                    <div class="search-result-item" data-type="pali" data-bid="${r.id}" data-page="${r.firstpage}">
                        <div class="res-header">
                            <span class="res-book">${r.name}</span>
                            <span class="res-page">${r.category_name || ''} • ${r.pagecount} မျက်နှာ</span>
                        </div>
                    </div>
                `;
            } else if (state.searchMode === "mm_book") {
                html += `
                    <div class="search-result-item" data-type="mm" data-bid="${r.id}" data-page="${r.first_page}">
                        <div class="res-header">
                            <span class="res-book">${r.name}</span>
                            <span class="res-page">${r.category_name || ''} • ${r.page_count} မျက်နှာ</span>
                        </div>
                    </div>
                `;
            } else if (state.searchMode === "mm_toc") {
                html += `
                    <div class="search-result-item" data-type="mm" data-bid="${r.book_id}" data-page="${r.page_number}">
                        <div class="res-header">
                            <span class="res-book">${r.name}</span>
                            <span class="res-page">${r.book_name} • စာ-${r.page_number}</span>
                        </div>
                    </div>
                `;
            }
        });

        el.searchResultsList.innerHTML = html;

        el.searchResultsList.querySelectorAll(".search-result-item").forEach(item => {
            item.addEventListener("click", () => {
                const targetType = item.getAttribute("data-type");
                const bid = item.getAttribute("data-bid");
                const p = parseInt(item.getAttribute("data-page"), 10);
                closeSearchModal();
                if (targetType === "mm") {
                    setReaderMode("mm");
                    loadMMBook(bid, p);
                } else {
                    setReaderMode("pali");
                    loadPaliBook(bid, p);
                }
            });
        });

    } catch (err) {
        console.error("Search error:", err);
        el.searchResultsList.innerHTML = `<div class="empty-state">ရှာဖွေရာတွင် အမှားဖြစ်ပေါ်ပါသည်: ${err.message}</div>`;
    }
}

function openSearchModal() {
    el.searchModal.classList.add("open");
    el.globalSearchInput.focus();
}

function closeSearchModal() {
    el.searchModal.classList.remove("open");
}

function toggleSidebar(forceState = null) {
    state.isSidebarOpen = (forceState !== null) ? forceState : !state.isSidebarOpen;
    el.appSidebar.classList.toggle("collapsed", !state.isSidebarOpen);
    if (state.isSidebarOpen && window.innerWidth <= 992) {
        toggleDictSidebar(false);
    }
    if (el.btnNavMore) el.btnNavMore.classList.toggle("active", state.isSidebarOpen);
    localStorage.setItem("tipitaka_sidebar_open", state.isSidebarOpen ? "1" : "0");
    updateSidebarBackdrop();
}

function updateSidebarBackdrop() {
    const isMobile = window.innerWidth <= 992;
    const backdrop = document.getElementById("sidebarBackdrop");
    if (!backdrop) return;
    if (isMobile && (state.isSidebarOpen || state.isDictOpen)) {
        backdrop.classList.add("active");
    } else {
        backdrop.classList.remove("active");
    }
    if (el.btnNavMore) el.btnNavMore.classList.toggle("active", state.isSidebarOpen);
    if (el.btnNavDict) el.btnNavDict.classList.toggle("active", state.isDictOpen);
}

function closeSidebarMobile() {
    if (state.isSidebarOpen) {
        toggleSidebar(false);
    }
    if (state.isDictOpen) {
        toggleDictSidebar(false);
    }
}

// ----------------- UI / Event Listeners -----------------

function setupEventListeners() {
    // Mode Switcher Buttons
    el.btnModePali.addEventListener("click", () => setReaderMode("pali"));
    el.btnModeMM.addEventListener("click", () => setReaderMode("mm"));
    el.btnModeSplit.addEventListener("click", () => setReaderMode("split"));
    el.btnCrossLink.addEventListener("click", handleCrossLink);

    // Toggle Footnotes / Variant Readings
    if (el.btnToggleNotes) {
        el.btnToggleNotes.addEventListener("click", () => {
            setNotesVisibility(!state.showNotes);
        });
    }
    if (el.btnToggleNotesMobile) {
        el.btnToggleNotesMobile.addEventListener("click", () => {
            setNotesVisibility(!state.showNotes);
        });
    }

    // Toggle Sidebar
    el.btnToggleSidebar.addEventListener("click", () => toggleSidebar());
    
    // Toggle Dictionary
    el.btnToggleDict.addEventListener("click", () => toggleDictSidebar());
    el.btnCloseDict.addEventListener("click", () => toggleDictSidebar(false));

    // Backdrop Click -> Close Drawers on Mobile
    const sidebarBackdrop = document.getElementById("sidebarBackdrop");
    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener("click", () => {
            closeSidebarMobile();
        });
    }

    // Mobile Close Button inside Drawer
    const btnCloseSidebarMobile = document.getElementById("btnCloseSidebarMobile");
    if (btnCloseSidebarMobile) {
        btnCloseSidebarMobile.addEventListener("click", () => toggleSidebar(false));
    }

    // Mobile Mode Buttons inside Drawer
    document.querySelectorAll(".mobile-mode-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const mode = btn.getAttribute("data-mode");
            setReaderMode(mode);
            setAppView("reader");
            if (window.innerWidth <= 768) {
                closeSidebarMobile();
            }
        });
    });

    // Mobile User Guide button inside Drawer
    const btnOpenHelpMobile = document.getElementById("btnOpenHelpMobile");
    if (btnOpenHelpMobile) {
        btnOpenHelpMobile.addEventListener("click", () => {
            closeSidebarMobile();
            if (el.helpModal) el.helpModal.classList.add("open");
        });
    }

    // Mobile Font Adjustments in Drawer
    const btnFontDecMobile = document.getElementById("btnFontDecMobile");
    const btnFontIncMobile = document.getElementById("btnFontIncMobile");
    if (btnFontDecMobile) btnFontDecMobile.addEventListener("click", () => setupFontSize(state.fontSize - 10));
    if (btnFontIncMobile) btnFontIncMobile.addEventListener("click", () => setupFontSize(state.fontSize + 10));
    
    // Page Navigation
    function prevPage(scrollToBottom = false) {
        if (state.scrollMode === "feed") {
            const cur = (state.readerMode === "mm") ? state.mmPage : state.paliPage;
            const first = (state.readerMode === "mm") ? state.mmFirstPage : state.paliFirstPage;
            const target = cur - 1;
            if (target >= first) {
                const prevEl = document.getElementById(state.readerMode === "mm" ? `mm-page-${target}` : `pali-page-${target}`);
                if (prevEl) {
                    prevEl.scrollIntoView({ behavior: "smooth", block: "start" });
                } else {
                    handleLoadPrevPage().then(() => {
                        const elTarget = document.getElementById(state.readerMode === "mm" ? `mm-page-${target}` : `pali-page-${target}`);
                        if (elTarget) elTarget.scrollIntoView({ behavior: "smooth", block: "start" });
                    });
                }
            }
        } else {
            if (state.readerMode === "mm") {
                if (state.mmPage > state.mmFirstPage) {
                    showScrollToast(`စာမျက်နှာ ${toMyanmarNum(state.mmPage - 1)} သို့ ပြောင်းနေပါသည်...`);
                    loadMMPage(state.mmBookId, state.mmPage - 1, false, scrollToBottom);
                }
            } else {
                if (state.paliPage > state.paliFirstPage) {
                    showScrollToast(`စာမျက်နှာ ${toMyanmarNum(state.paliPage - 1)} သို့ ပြောင်းနေပါသည်...`);
                    loadPaliPage(state.paliBookId, state.paliPage - 1, null, scrollToBottom);
                }
            }
        }
    }

    function nextPage(scrollToBottom = false) {
        if (state.scrollMode === "feed") {
            const cur = (state.readerMode === "mm") ? state.mmPage : state.paliPage;
            const last = (state.readerMode === "mm") ? state.mmLastPage : state.paliLastPage;
            const target = cur + 1;
            if (target <= last) {
                const nextEl = document.getElementById(state.readerMode === "mm" ? `mm-page-${target}` : `pali-page-${target}`);
                if (nextEl) {
                    nextEl.scrollIntoView({ behavior: "smooth", block: "start" });
                } else {
                    if (state.readerMode === "mm") {
                        loadMMPage(state.mmBookId, target, false, true).then(() => {
                            const elTarget = document.getElementById(`mm-page-${target}`);
                            if (elTarget) elTarget.scrollIntoView({ behavior: "smooth", block: "start" });
                        });
                    } else {
                        loadPaliPage(state.paliBookId, target, null, true).then(() => {
                            const elTarget = document.getElementById(`pali-page-${target}`);
                            if (elTarget) elTarget.scrollIntoView({ behavior: "smooth", block: "start" });
                        });
                    }
                }
            }
        } else {
            if (state.readerMode === "mm") {
                if (state.mmPage < state.mmLastPage) {
                    showScrollToast(`စာမျက်နှာ ${toMyanmarNum(state.mmPage + 1)} သို့ ပြောင်းနေပါသည်...`);
                    loadMMPage(state.mmBookId, state.mmPage + 1, false, scrollToBottom);
                }
            } else {
                if (state.paliPage < state.paliLastPage) {
                    showScrollToast(`စာမျက်နှာ ${toMyanmarNum(state.paliPage + 1)} သို့ ပြောင်းနေပါသည်...`);
                    loadPaliPage(state.paliBookId, state.paliPage + 1, null, scrollToBottom);
                }
            }
        }
    }

    el.btnPrevPage.addEventListener("click", () => prevPage(false));
    el.btnNextPage.addEventListener("click", () => nextPage(false));
    el.btnFooterPrev.addEventListener("click", () => prevPage(false));
    el.btnFooterNext.addEventListener("click", () => nextPage(false));

    if (el.btnLoadPrevPage) {
        el.btnLoadPrevPage.addEventListener("click", handleLoadPrevPage);
    }

    if (el.pageScrollIndicator) {
        el.pageScrollIndicator.addEventListener("click", () => nextPage(false));
    }

    // Scroll Mode Dropdown in Header
    if (el.btnScrollMode && el.scrollModeDropdownWrapper) {
        el.btnScrollMode.addEventListener("click", (e) => {
            e.stopPropagation();
            el.scrollModeDropdownWrapper.classList.toggle("open");
        });
        document.addEventListener("click", () => {
            el.scrollModeDropdownWrapper.classList.remove("open");
        });
    }

    // Scroll Mode Selection (Dropdown & Mobile Drawer)
    document.querySelectorAll(".scroll-opt-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const mode = btn.getAttribute("data-scroll-mode");
            setScrollMode(mode);
            if (el.scrollModeDropdownWrapper) el.scrollModeDropdownWrapper.classList.remove("open");
        });
    });

    document.querySelectorAll(".mobile-scroll-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const mode = btn.getAttribute("data-scroll-mode");
            setScrollMode(mode);
        });
    });

    // Mouse Wheel Continuous Page Scroll (Only active in Single mode; Feed mode uses native scroll)
    let wheelDeltaAccumulator = 0;
    let wheelCooldown = false;
    let wheelResetTimer = null;

    el.readerContainer.addEventListener("wheel", (e) => {
        if (state.readerMode === "split") return;
        if (state.scrollMode !== "single") return; // Feed mode uses pure native 120Hz/60Hz smooth scroll

        const container = el.readerContainer;
        const isAtBottom = (container.scrollHeight - container.scrollTop - container.clientHeight) <= 8;
        const isAtTop = container.scrollTop <= 5;

        if (e.deltaY > 0 && isAtBottom) {
            if (wheelCooldown) return;
            wheelDeltaAccumulator += e.deltaY;
            clearTimeout(wheelResetTimer);
            wheelResetTimer = setTimeout(() => { wheelDeltaAccumulator = 0; }, 400);

            if (wheelDeltaAccumulator >= 120) {
                wheelCooldown = true;
                wheelDeltaAccumulator = 0;
                nextPage(false);
                setTimeout(() => { wheelCooldown = false; }, 600);
            }
        } else if (e.deltaY < 0 && isAtTop) {
            if (wheelCooldown) return;
            wheelDeltaAccumulator += Math.abs(e.deltaY);
            clearTimeout(wheelResetTimer);
            wheelResetTimer = setTimeout(() => { wheelDeltaAccumulator = 0; }, 400);

            if (wheelDeltaAccumulator >= 120) {
                wheelCooldown = true;
                wheelDeltaAccumulator = 0;
                prevPage(true);
                setTimeout(() => { wheelCooldown = false; }, 600);
            }
        } else {
            wheelDeltaAccumulator = 0;
        }
    }, { passive: true });

    // Touch Gestures: Horizontal Swipe & Vertical Boundary Pull
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    let touchStartAtTop = false;
    let touchStartAtBottom = false;

    el.readerContainer.addEventListener("touchstart", (e) => {
        if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchEndX = touchStartX;
            touchEndY = touchStartY;

            const c = el.readerContainer;
            touchStartAtTop = c.scrollTop <= 8;
            touchStartAtBottom = (c.scrollHeight - c.scrollTop - c.clientHeight) <= 15;
        }
    }, { passive: true });

    el.readerContainer.addEventListener("touchmove", (e) => {
        if (e.touches.length === 1) {
            touchEndX = e.touches[0].clientX;
            touchEndY = e.touches[0].clientY;
        }
    }, { passive: true });

    el.readerContainer.addEventListener("touchend", () => {
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;
        const absX = Math.abs(diffX);
        const absY = Math.abs(diffY);

        if (state.scrollMode === "single") {
            // Horizontal Swipe (Left/Right)
            if (absX > 65 && absY < 50) {
                if (diffX < 0) nextPage(false);
                else prevPage(false);
                return;
            }

            // Vertical Boundary Pull (Up/Down)
            if (touchStartAtBottom && diffY < -70 && absX < 60) {
                nextPage(false);
                return;
            }
            if (touchStartAtTop && diffY > 70 && absX < 60) {
                prevPage(true);
                return;
            }
        }
    });

    // Infinite Feed Scroll listener (Desktop mouse wheel & Mobile finger scroll)
    let feedScrollThrottleTimer = null;
    el.readerContainer.addEventListener("scroll", () => {
        if (state.scrollMode !== "feed") return;

        // Auto load next page when scrolled near bottom (within 250px)
        if (!feedScrollThrottleTimer) {
            feedScrollThrottleTimer = setTimeout(() => {
                feedScrollThrottleTimer = null;
                const c = el.readerContainer;
                if (c && (c.scrollHeight - c.scrollTop - c.clientHeight <= 250)) {
                    loadNextFeedPage();
                }
            }, 120);
        }

        // Auto track and update reading page number
        checkVisiblePageOnScroll();
    }, { passive: true });
    
    // Page Number Input Jump
    el.pageNumberInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            const p = parseInt(el.pageNumberInput.value, 10);
            if (!isNaN(p)) {
                if (state.readerMode === "mm") loadMMPage(state.mmBookId, p);
                else loadPaliPage(state.paliBookId, p);
            }
        }
    });

    // Bookmark Toggle
    el.btnBookmarkToggle.addEventListener("click", toggleCurrentBookmark);

    // Commentary Dropdown
    el.btnRelated.addEventListener("click", (e) => {
        e.stopPropagation();
        el.relatedDropdownWrapper.classList.toggle("open");
    });
    document.addEventListener("click", () => {
        el.relatedDropdownWrapper.classList.remove("open");
    });

    // Sidebar Tabs Switcher
    el.sidebarTabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const tabId = btn.getAttribute("data-tab");
            el.sidebarTabBtns.forEach(b => b.classList.remove("active"));
            el.sidebarPanels.forEach(p => p.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById(tabId).classList.add("active");
            state.activeTab = tabId;
        });
    });

    // Basket Filtering in Books tab (Pali)
    el.basketBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            el.basketBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            state.activeBasket = btn.getAttribute("data-basket");
            renderBooksTree();
        });
    });
    el.booksFilterInput.addEventListener("input", () => renderBooksTree());
    el.tocFilterInput.addEventListener("input", () => renderTOC());
    el.suttaFilterInput.addEventListener("input", () => renderSuttas());

    // Font Size Adjustments
    el.btnFontDec.addEventListener("click", () => setupFontSize(state.fontSize - 10));
    el.btnFontInc.addEventListener("click", () => setupFontSize(state.fontSize + 10));

    // Themes
    el.themeBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const theme = btn.getAttribute("data-theme");
            setupTheme(theme);
        });
    });

    // Dictionary Manual Search
    el.btnDictSearch.addEventListener("click", () => {
        lookupDictionary(el.dictSearchInput.value.trim());
    });
    el.dictSearchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") lookupDictionary(el.dictSearchInput.value.trim());
    });

    // Search Modal
    el.btnOpenSearch.addEventListener("click", openSearchModal);
    el.btnCloseModal.addEventListener("click", closeSearchModal);
    el.searchModal.addEventListener("click", (e) => {
        if (e.target === el.searchModal) closeSearchModal();
    });

    // Help / User Guide Modal
    el.btnOpenHelp.addEventListener("click", () => el.helpModal.classList.add("open"));
    el.btnCloseHelp.addEventListener("click", () => el.helpModal.classList.remove("open"));
    el.helpModal.addEventListener("click", (e) => {
        if (e.target === el.helpModal) el.helpModal.classList.remove("open");
    });
    el.globalSearchInput.addEventListener("input", () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(performSearch, 300);
        el.btnClearSearch.style.display = el.globalSearchInput.value ? "block" : "none";
    });
    el.btnClearSearch.addEventListener("click", () => {
        el.globalSearchInput.value = "";
        el.btnClearSearch.style.display = "none";
        performSearch();
    });
    el.modalTabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            el.modalTabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            state.searchMode = btn.getAttribute("data-mode");
            performSearch();
        });
    });

    // Word Click in Reader Content -> Trigger Dictionary (for both Single and Split View)
    function handleWordClick(e) {
        const sel = window.getSelection();
        let clickedWord = "";

        if (sel && sel.toString().trim()) {
            clickedWord = sel.toString().trim();
        } else if (sel && sel.isCollapsed) {
            try {
                sel.modify("extend", "backward", "character");
                let charBefore = sel.toString();
                sel.modify("move", "forward", "character");
                sel.modify("extend", "forward", "character");
                let charAfter = sel.toString();
                
                if (!/\s/.test(charBefore) && !/\s/.test(charAfter)) {
                    let p1 = sel.toString();
                    while (!/\s/.test(p1) && p1.length < 50) {
                        sel.modify("extend", "backward", "character");
                        p1 = sel.toString();
                    }
                    p1 = p1.trim();
                    sel.modify("move", "forward", "character");
                    
                    sel.modify("extend", "forward", "character");
                    let p2 = sel.toString();
                    while (!/\s/.test(p2) && p2.length < 50) {
                        sel.modify("extend", "forward", "character");
                        p2 = sel.toString();
                    }
                    p2 = p2.trim();
                    clickedWord = p1 + p2;
                }
                sel.removeAllRanges();
            } catch (ex) {}
        }

        if (clickedWord) {
            clickedWord = clickedWord.replace(/[\s\d၀-၉၊။,.\-—–“’”\"'()\[\]<>:;?!/\\#*~`]+/g, "").trim();
            if (clickedWord.length > 0) {
                lookupDictionary(clickedWord);
            }
        }
    }

    el.paliContent.addEventListener("click", handleWordClick);
    el.splitPaliContent.addEventListener("click", handleWordClick);

    // Quick Popover Close
    el.btnClosePopover.addEventListener("click", () => {
        el.dictQuickPopover.style.display = "none";
    });
    el.btnOpenInFullDict.addEventListener("click", () => {
        el.dictQuickPopover.style.display = "none";
        toggleDictSidebar(true);
        lookupDictionary(el.popoverWord.textContent);
    });

    // Global Keyboard Shortcuts
    document.addEventListener("keydown", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
            if (e.key === "Escape") {
                closeSearchModal();
                el.helpModal.classList.remove("open");
                el.dictQuickPopover.style.display = "none";
            }
            return;
        }

        if (e.key === "[" || e.key === "ArrowLeft") {
            prevPage();
        } else if (e.key === "]" || e.key === "ArrowRight") {
            nextPage();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
            openSearchModal();
        } else if (e.key === "/" && !el.searchModal.classList.contains("open")) {
            e.preventDefault();
            openSearchModal();
        } else if (e.key === "?" && !el.helpModal.classList.contains("open")) {
            e.preventDefault();
            el.helpModal.classList.add("open");
        } else if (e.key === "Escape") {
            closeSearchModal();
            el.helpModal.classList.remove("open");
            el.dictQuickPopover.style.display = "none";
        }
    });

    // Home Navigation & Bottom Bar (APK Style)
    if (el.btnGoHome) {
        el.btnGoHome.addEventListener("click", () => setAppView("home"));
    }

    if (el.homeBasketTabs) {
        el.homeBasketTabs.querySelectorAll(".home-basket-tab").forEach(tab => {
            tab.addEventListener("click", () => {
                state.homeBasket = tab.getAttribute("data-basket");
                renderHomeCatalog();
            });
        });
    }

    if (el.homeBtnModeToggle) {
        el.homeBtnModeToggle.addEventListener("click", () => {
            const nextMode = (state.readerMode === "mm") ? "pali" : "mm";
            setReaderMode(nextMode);
            renderHomeCatalog();
        });
    }

    if (el.homeBtnSearch) {
        el.homeBtnSearch.addEventListener("click", openSearchModal);
    }

    if (el.btnFloatingSutta) {
        el.btnFloatingSutta.addEventListener("click", () => {
            openSearchModal();
            const suttaTabBtn = document.querySelector('.modal-tab-btn[data-mode="sutta"]');
            if (suttaTabBtn) suttaTabBtn.click();
        });
    }

    if (el.btnNavHome) {
        el.btnNavHome.addEventListener("click", () => {
            closeSidebarMobile();
            setAppView("home");
        });
    }
    if (el.btnNavReader) {
        el.btnNavReader.addEventListener("click", async () => {
            closeSidebarMobile();
            if (!state.paliBookId && !state.mmBookId) {
                await loadRecentOrFirst();
            }
            setAppView("reader");
        });
    }
    if (el.btnNavRecent) {
        el.btnNavRecent.addEventListener("click", async () => {
            closeSidebarMobile();
            await loadRecentOrFirst();
            setAppView("reader");
        });
    }
    if (el.btnNavDict) {
        el.btnNavDict.addEventListener("click", () => {
            toggleDictSidebar();
            if (state.isDictOpen && el.dictSearchInput) {
                setTimeout(() => el.dictSearchInput.focus(), 250);
            }
        });
    }
    if (el.btnNavMore) {
        el.btnNavMore.addEventListener("click", () => toggleSidebar());
    }
}

function toggleDictSidebar(forceState = null) {
    state.isDictOpen = (forceState !== null) ? forceState : !state.isDictOpen;
    el.dictSidebar.classList.toggle("collapsed", !state.isDictOpen);
    el.btnToggleDict.classList.toggle("active", state.isDictOpen);
    if (el.btnNavDict) el.btnNavDict.classList.toggle("active", state.isDictOpen);
    if (state.isDictOpen && window.innerWidth <= 992) {
        state.isSidebarOpen = false;
        el.appSidebar.classList.add("collapsed");
        if (el.btnNavMore) el.btnNavMore.classList.remove("active");
    }
    localStorage.setItem("tipitaka_dict_open", state.isDictOpen ? "1" : "0");
    updateSidebarBackdrop();
}

function setupTheme(themeName) {
    state.theme = themeName;
    document.documentElement.setAttribute("data-theme", themeName);
    document.body.classList.remove("theme-paper", "theme-light", "theme-night");
    document.body.classList.add(`theme-${themeName}`);
    document.querySelectorAll(".theme-btn").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-theme") === themeName);
    });
    localStorage.setItem("tipitaka_theme", themeName);
}

function setNotesVisibility(show) {
    state.showNotes = show;
    document.body.classList.toggle("hide-notes", !show);
    
    if (el.btnToggleNotes) {
        el.btnToggleNotes.classList.toggle("active", show);
        if (el.toggleNotesLabel) {
            el.toggleNotesLabel.textContent = show ? "မူကွဲ: ဖွင့်" : "မူကွဲ: ပိတ်";
        }
        el.btnToggleNotes.title = show ? "မူကွဲပါဠိတော်များ ဖွင့်ထားပါသည် (ပိတ်ရန် နှိပ်ပါ)" : "မူကွဲပါဠိတော်များ ပိတ်ထားပါသည် (ဖွင့်ရန် နှိပ်ပါ)";
    }
    
    if (el.btnToggleNotesMobile) {
        el.btnToggleNotesMobile.classList.toggle("active", show);
        if (el.toggleNotesLabelMobile) {
            el.toggleNotesLabelMobile.textContent = show ? "မူကွဲပါဠိတော်များ: ဖွင့်ထားသည်" : "မူကွဲပါဠိတော်များ: ပိတ်ထားသည်";
        }
    }

    localStorage.setItem("tipitaka_show_notes", show ? "1" : "0");
}

function setScrollMode(mode) {
    state.scrollMode = mode;
    localStorage.setItem("tipitaka_scroll_mode", mode);
    
    // Update header dropdown button text & icon
    const icons = {
        feed: "📜",
        single: "📖"
    };
    const labels = {
        feed: "စာမျက်နှာဆက်တိုက်",
        single: "တစ်မျက်နှာချင်း"
    };
    if (el.scrollModeIcon) el.scrollModeIcon.textContent = icons[mode] || "📜";
    if (el.scrollModeText) el.scrollModeText.textContent = labels[mode] || "စာမျက်နှာဆက်တိုက်";

    // Update active class on dropdown options & mobile drawer options
    document.querySelectorAll(".scroll-opt-btn").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-scroll-mode") === mode);
    });
    document.querySelectorAll(".mobile-scroll-btn").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-scroll-mode") === mode);
    });

    if (mode === "feed") {
        if (el.infiniteSentinel) el.infiniteSentinel.style.display = "flex";
        if (el.pageScrollIndicator) el.pageScrollIndicator.style.display = "none";
        setupSentinelObserver();
    } else {
        if (el.infiniteSentinel) el.infiniteSentinel.style.display = "none";
        if (el.loadPrevBox) el.loadPrevBox.style.display = "none";
        if (el.pageScrollIndicator) el.pageScrollIndicator.style.display = "flex";
        if (infiniteSentinelObserver) {
            infiniteSentinelObserver.disconnect();
            infiniteSentinelObserver = null;
        }
        const curPage = (state.readerMode === "mm") ? state.mmPage : state.paliPage;
        if (state.readerMode === "mm") loadMMPage(state.mmBookId, curPage);
        else if (state.readerMode === "pali") loadPaliPage(state.paliBookId, curPage);
    }
}

let infiniteSentinelObserver = null;
function setupSentinelObserver() {
    if (infiniteSentinelObserver) {
        infiniteSentinelObserver.disconnect();
        infiniteSentinelObserver = null;
    }
    if (state.scrollMode !== "feed") return;

    const sentinel = document.getElementById("infiniteSentinel");
    if (!sentinel) return;

    infiniteSentinelObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                loadNextFeedPage();
            }
        });
    }, {
        root: el.readerContainer,
        rootMargin: "0px 0px 200px 0px",
        threshold: 0.05
    });

    infiniteSentinelObserver.observe(sentinel);
}

let scrollPageCheckTimer = null;
function checkVisiblePageOnScroll() {
    if (scrollPageCheckTimer) return;
    scrollPageCheckTimer = setTimeout(() => {
        scrollPageCheckTimer = null;
        const pageItems = document.querySelectorAll(".feed-page-item");
        if (!pageItems.length) return;

        const containerRect = el.readerContainer.getBoundingClientRect();
        const triggerLine = containerRect.top + 220;

        let activePage = null;
        pageItems.forEach(item => {
            const rect = item.getBoundingClientRect();
            if (rect.top <= triggerLine && rect.bottom >= triggerLine) {
                const p = parseInt(item.getAttribute("data-page"), 10);
                if (!isNaN(p)) activePage = p;
            }
        });

        if (activePage) {
            updateCurrentViewPage(activePage);
        }
    }, 50);
}

async function loadNextFeedPage() {
    if (state.isLoadingMore) return;
    if (state.scrollMode !== "feed") return;

    if (state.readerMode === "pali") {
        const currentLast = parseInt(state.feedLastLoadedPage, 10);
        const nextPage = currentLast + 1;
        if (state.feedLoadedPages && state.feedLoadedPages.has(nextPage)) return;
        if (nextPage > state.paliLastPage) {
            showSentinelEnd();
            return;
        }
        state.isLoadingMore = true;
        showSentinelLoading(true);
        try {
            await loadPaliPage(state.paliBookId, nextPage, null, true);
        } catch (e) {
            console.error(e);
        } finally {
            state.isLoadingMore = false;
            showSentinelLoading(false);
        }
    } else if (state.readerMode === "mm") {
        const currentLast = parseInt(state.feedLastLoadedPage, 10);
        const nextPage = currentLast + 1;
        if (state.feedLoadedPages && state.feedLoadedPages.has(nextPage)) return;
        if (nextPage > state.mmLastPage) {
            showSentinelEnd();
            return;
        }
        state.isLoadingMore = true;
        showSentinelLoading(true);
        try {
            await loadMMPage(state.mmBookId, nextPage, false, true);
        } catch (e) {
            console.error(e);
        } finally {
            state.isLoadingMore = false;
            showSentinelLoading(false);
        }
    }
}

async function handleLoadPrevPage() {
    if (state.isLoadingMore) return;
    state.isLoadingMore = true;
    if (el.btnLoadPrevPage) el.btnLoadPrevPage.disabled = true;

    try {
        if (state.readerMode === "pali") {
            const currentFirst = parseInt(state.feedFirstLoadedPage, 10);
            const prevPageNum = currentFirst - 1;
            if (state.feedLoadedPages && state.feedLoadedPages.has(prevPageNum)) return;
            if (prevPageNum >= state.paliFirstPage) {
                await loadPaliPage(state.paliBookId, prevPageNum, null, false, true);
            }
        } else if (state.readerMode === "mm") {
            const currentFirst = parseInt(state.feedFirstLoadedPage, 10);
            const prevPageNum = currentFirst - 1;
            if (state.feedLoadedPages && state.feedLoadedPages.has(prevPageNum)) return;
            if (prevPageNum >= state.mmFirstPage) {
                await loadMMPage(state.mmBookId, prevPageNum, false, false, true);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        state.isLoadingMore = false;
        if (el.btnLoadPrevPage) el.btnLoadPrevPage.disabled = false;
    }
}

let pageVisibilityObserver = null;
function setupPageVisibilityObserver() {
    if (pageVisibilityObserver) {
        pageVisibilityObserver.disconnect();
        pageVisibilityObserver = null;
    }

    pageVisibilityObserver = new IntersectionObserver((entries) => {
        let bestEntry = null;
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio) {
                    bestEntry = entry;
                }
            }
        });

        if (bestEntry) {
            const p = parseInt(bestEntry.target.getAttribute("data-page"), 10);
            if (!isNaN(p)) {
                updateCurrentViewPage(p);
            }
        }
    }, {
        root: el.readerContainer,
        rootMargin: "-5% 0px -40% 0px",
        threshold: [0.1, 0.3, 0.6]
    });

    document.querySelectorAll(".feed-page-item").forEach(sec => {
        pageVisibilityObserver.observe(sec);
    });
}

function updateCurrentViewPage(pageNum) {
    if (state.readerMode === "pali") {
        if (state.paliPage === pageNum) return;
        state.paliPage = pageNum;
        el.metaPageNum.textContent = toMyanmarNum(pageNum);
        el.pageNumberInput.value = pageNum;
        el.footerCurrentPage.textContent = toMyanmarNum(pageNum);
        el.btnPrevPage.disabled = (pageNum <= state.paliFirstPage);
        el.btnNextPage.disabled = (pageNum >= state.paliLastPage);
        updateBookmarkIconStatus();
        highlightActiveToc(pageNum);
        debounceRecent(state.paliBookId, pageNum);
    } else if (state.readerMode === "mm") {
        if (state.mmPage === pageNum) return;
        state.mmPage = pageNum;
        el.metaPageNum.textContent = toMyanmarNum(pageNum);
        el.pageNumberInput.value = pageNum;
        el.footerCurrentPage.textContent = toMyanmarNum(pageNum);
        el.btnPrevPage.disabled = (pageNum <= state.mmFirstPage);
        el.btnNextPage.disabled = (pageNum >= state.mmLastPage);
        highlightActiveToc(pageNum);
    }
}

let recentDebounceTimer = null;
function debounceRecent(bookId, pageNum) {
    clearTimeout(recentDebounceTimer);
    recentDebounceTimer = setTimeout(() => {
        fetch("/api/recent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ book_id: bookId, page_number: pageNum })
        }).catch(() => {});
    }, 800);
}

function showSentinelLoading(show) {
    if (!el.sentinelLoading) return;
    el.sentinelLoading.style.display = show ? "inline-flex" : "none";
}

function showSentinelEnd() {
    if (el.sentinelEnd) el.sentinelEnd.style.display = "block";
    if (el.sentinelLoading) el.sentinelLoading.style.display = "none";
}

let scrollToastTimer = null;
function showScrollToast(text) {
    if (!el.scrollPageToast || !el.scrollPageToastText) return;
    el.scrollPageToastText.textContent = text;
    el.scrollPageToast.classList.add("show");
    clearTimeout(scrollToastTimer);
    scrollToastTimer = setTimeout(() => {
        el.scrollPageToast.classList.remove("show");
    }, 1800);
}

function updateScrollIndicator(curPage, lastPage) {
    if (!el.pageScrollIndicator || !el.pageScrollIndicatorText) return;
    if (curPage < lastPage) {
        el.pageScrollIndicator.style.display = "flex";
        el.pageScrollIndicatorText.textContent = `နောက်စာမျက်နှာ (${toMyanmarNum(curPage + 1)}) သို့ ဆက်ရန် အောက်သို့ လှိမ့်ပါ`;
    } else {
        el.pageScrollIndicator.style.display = "flex";
        el.pageScrollIndicatorText.textContent = `ကျမ်းစာအုပ်၏ နောက်ဆုံးစာမျက်နှာသို့ ရောက်ရှိပါပြီ`;
    }
}

function setupFontSize(size) {
    if (size < 70) size = 70;
    if (size > 200) size = 200;
    state.fontSize = size;
    el.readerPaper.style.fontSize = `${1.25 * (size / 100)}rem`;
    el.splitPaliContent.style.fontSize = `${1.15 * (size / 100)}rem`;
    el.splitMMContent.style.fontSize = `${1.15 * (size / 100)}rem`;
    el.fontSizeDisplay.textContent = `${size}%`;
    const fsMobile = document.getElementById("fontSizeDisplayMobile");
    if (fsMobile) fsMobile.textContent = `${size}%`;
    localStorage.setItem("tipitaka_font_size", size.toString());
}

function toMyanmarNum(num) {
    const mmDigits = ['၀', '၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉'];
    return num.toString().replace(/\d/g, d => mmDigits[parseInt(d, 10)]);
}

// Start app
window.addEventListener("DOMContentLoaded", initApp);
