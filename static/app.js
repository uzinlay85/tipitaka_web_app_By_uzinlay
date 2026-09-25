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
    companionData: null,

    // Dynamic Companion Split View State
    splitRightType: localStorage.getItem("tipitaka_split_comp_type") || "attha", // 'attha' | 'tika' | 'mula' | 'mm'
    splitRightBookId: null,
    splitRightBookName: "",
    splitRightPage: 1,
    splitRightLastPage: 1,

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
    appView: "home",
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
    feedSessionId: 0,
    isLoadingMore: false,
    historyActiveTab: "reading",
    historyModeFilter: "all",
    isFocusMode: false
};

// DOM Elements
const el = {
    appSidebar: document.getElementById("appSidebar"),
    dictSidebar: document.getElementById("dictSidebar"),
    btnToggleSidebar: document.getElementById("btnToggleSidebar"),
    btnToggleDict: document.getElementById("btnToggleDict"),
    btnToggleFullscreen: document.getElementById("btnToggleFullscreen"),
    btnToggleFullscreenMobile: document.getElementById("btnToggleFullscreenMobile"),
    btnExitFocusMode: document.getElementById("btnExitFocusMode"),
    fullscreenIcon: document.getElementById("fullscreenIcon"),
    fullscreenMobileLabel: document.getElementById("fullscreenMobileLabel"),
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
    currentBookBadge: document.getElementById("currentBookBadge"),
    bookTitleDisplay: document.getElementById("bookTitleDisplay"),
    chapterTitleDisplay: document.getElementById("chapterTitleDisplay"),
    mobileBreadcrumbWrapper: document.getElementById("mobileBreadcrumbWrapper"),
    mobileChapterBreadcrumb: document.getElementById("mobileChapterBreadcrumb"),
    mobileBreadcrumbBook: document.getElementById("mobileBreadcrumbBook"),
    mobileBreadcrumbChapter: document.getElementById("mobileBreadcrumbChapter"),
    mobileBreadcrumbPage: document.getElementById("mobileBreadcrumbPage"),
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
    
    // Split View (Left: Current Pali / Right: Dynamic Companion)
    splitViewContainer: document.getElementById("splitViewContainer"),
    splitPaliTitle: document.getElementById("splitPaliTitle"),
    splitPaliContent: document.getElementById("splitPaliContent"),
    btnSplitPaliPrev: document.getElementById("btnSplitPaliPrev"),
    btnSplitPaliNext: document.getElementById("btnSplitPaliNext"),
    splitPaliPageInput: document.getElementById("splitPaliPageInput"),
    splitPaliTotalDisplay: document.getElementById("splitPaliTotalDisplay"),

    // Dynamic Companion Elements (Right Pane)
    companionTabsBar: document.getElementById("companionTabsBar"),
    compVolumeBox: document.getElementById("compVolumeBox"),
    compVolumeSelect: document.getElementById("compVolumeSelect"),
    splitRightPane: document.getElementById("splitRightPane"),
    splitRightContent: document.getElementById("splitRightContent") || document.getElementById("splitMMContent"),
    btnSplitRightPrev: document.getElementById("btnSplitRightPrev") || document.getElementById("btnSplitMMPrev"),
    btnSplitRightNext: document.getElementById("btnSplitRightNext") || document.getElementById("btnSplitMMNext"),
    splitRightPageInput: document.getElementById("splitRightPageInput") || document.getElementById("splitMMPageInput"),
    splitRightTotalDisplay: document.getElementById("splitRightTotalDisplay") || document.getElementById("splitMMTotalDisplay"),
    btnOpenCompanionMobile: document.getElementById("btnOpenCompanionMobile"),

    // Aliases for backwards compatibility
    splitMMTitle: document.getElementById("splitMMTitle"),
    splitMMContent: document.getElementById("splitRightContent") || document.getElementById("splitMMContent"),
    btnSplitMMPrev: document.getElementById("btnSplitRightPrev") || document.getElementById("btnSplitMMPrev"),
    btnSplitMMNext: document.getElementById("btnSplitRightNext") || document.getElementById("btnSplitMMNext"),
    splitMMPageInput: document.getElementById("splitRightPageInput") || document.getElementById("splitMMPageInput"),
    splitMMTotalDisplay: document.getElementById("splitRightTotalDisplay") || document.getElementById("splitMMTotalDisplay"),
    btnSplitSync: document.getElementById("btnSplitSync"),

    // Sidebar Tabs
    sidebarTabBtns: document.querySelectorAll(".sidebar-tabs .tab-btn"),
    sidebarPanels: document.querySelectorAll(".sidebar-tab-panel"),
    basketBtns: document.querySelectorAll(".basket-btn"),
    booksFilterInput: document.getElementById("booksFilterInput"),
    booksTreeList: document.getElementById("booksTreeList"),
    tocFilterInput: document.getElementById("tocFilterInput"),
    tocList: document.getElementById("tocList"),
    tocCurrentCard: document.getElementById("tocCurrentCard"),
    tocCurrentPagePill: document.getElementById("tocCurrentPagePill"),
    tocCurrentTitle: document.getElementById("tocCurrentTitle"),
    tocCurrentRange: document.getElementById("tocCurrentRange"),
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
    btnNavMore: document.getElementById("btnNavMore"),

    // History Modal & Insights / Backup
    historyModal: document.getElementById("historyModal"),
    btnOpenHistory: document.getElementById("btnOpenHistory"),
    btnOpenHistoryMobile: document.getElementById("btnOpenHistoryMobile"),
    btnCloseHistory: document.getElementById("btnCloseHistory"),
    btnClearAllHistory: document.getElementById("btnClearAllHistory"),
    btnBackupHistory: document.getElementById("btnBackupHistory"),
    btnRestoreHistory: document.getElementById("btnRestoreHistory"),
    restoreFileInput: document.getElementById("restoreFileInput"),
    historySearchWrapper: document.getElementById("historySearchWrapper"),
    historyFilterInput: document.getElementById("historyFilterInput"),
    btnClearHistoryFilter: document.getElementById("btnClearHistoryFilter"),
    tabHistoryReading: document.getElementById("tabHistoryReading"),
    tabHistorySearch: document.getElementById("tabHistorySearch"),
    tabHistoryInsights: document.getElementById("tabHistoryInsights"),
    historyReadingBadge: document.getElementById("historyReadingBadge"),
    historySearchBadge: document.getElementById("historySearchBadge"),
    historyFilterPills: document.getElementById("historyFilterPills"),
    historyItemsContainer: document.getElementById("historyItemsContainer")
};

// Initialize Application
async function initApp() {
    setupTheme(state.theme);
    setupFontSize(state.fontSize);
    setNotesVisibility(state.showNotes);
    setScrollMode(state.scrollMode);
    setupEventListeners();
    
    // Always start on Home page when entering the web app
    localStorage.removeItem("tipitaka_app_view");
    setAppView("home");

    const domLink = document.getElementById("appCurrentDomainLink");
    if (domLink && window.location.origin) {
        domLink.textContent = window.location.origin;
    }

    if (!state.isSidebarOpen) el.appSidebar.classList.add("collapsed");
    if (!state.isDictOpen || state.appView === "home") el.dictSidebar.classList.add("collapsed");
    el.btnToggleDict.classList.toggle("active", state.isDictOpen && state.appView !== "home");
    
    await loadCategories();
    await loadBookmarks();
    HistoryManager.updateBadgeCounts();

    // Preload recent book info in background without altering view or display styles
    try {
        const hist = HistoryManager.getReadingHistory();
        if (hist && hist.length > 0) {
            state.paliBookId = hist[0].bookId;
            state.paliPage = hist[0].page || 1;
        } else {
            const res = await fetch("/api/recent");
            const recent = await res.json();
            if (recent && recent.book_id) {
                state.paliBookId = recent.book_id;
                state.paliPage = recent.page_number || 1;
            } else {
                state.paliBookId = "mula_vi_01";
                state.paliPage = 1;
            }
        }
    } catch (e) {
        state.paliBookId = "mula_vi_01";
        state.paliPage = 1;
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
    const list = HistoryManager.getReadingHistory();
    if (list && list.length > 0) {
        const top = list[0];
        if (top.mode === "mm") {
            setReaderMode("mm");
            await loadMMBook(top.bookId, top.page);
        } else if (top.mode === "split") {
            setReaderMode("split");
            await loadPaliBook(top.bookId, top.page);
            if (top.splitMMBookId) await loadMMPage(top.splitMMBookId, top.splitMMPage || 1);
        } else {
            setReaderMode("pali");
            await loadPaliBook(top.bookId, top.page);
        }
        return;
    }

    try {
        const res = await fetch("/api/recent");
        const recent = await res.json();
        if (recent && recent.book_id) {
            await loadPaliBook(recent.book_id, recent.page_number || null);
        } else {
            await loadPaliBook("mula_vi_01", null);
        }
    } catch (err) {
        await loadPaliBook("mula_vi_01", null);
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

function getLoadedFeedPages() {
    const isMM = (state.readerMode === "mm");
    const prefix = isMM ? "mm-page-" : "pali-page-";
    const items = el.paliContent.querySelectorAll(`.feed-page-item[id^="${prefix}"]`);
    const pages = [];
    items.forEach(it => {
        const p = parseInt(it.getAttribute("data-page"), 10);
        if (!isNaN(p)) pages.push(p);
    });
    return pages.sort((a, b) => a - b);
}

// ----------------- Pali Reader -----------------

async function loadPaliBook(bookId, targetPage = null) {
    state.feedSessionId = (state.feedSessionId || 0) + 1;
    const thisSession = state.feedSessionId;

    if (state.paliBookId !== bookId || state.paliTocs.length === 0) {
        state.paliBookId = bookId;
        try {
            const res = await fetch(`/api/book/${bookId}`);
            if (thisSession !== state.feedSessionId) return;
            const data = await res.json();
            state.paliBookName = data.book.name;
            state.paliFirstPage = data.book.firstpage;
            state.paliLastPage = data.book.lastpage;
            state.paliTocs = data.tocs || [];
            state.paliSuttas = data.suttas || [];
            state.paliRelated = data.related || [];
            state.companionData = data.companions || null;
            
            renderTOC();
            renderSuttas();
            renderRelatedDropdown();
            highlightActiveBookInSidebar();
        } catch (err) {
            console.error("Failed to load pali book metadata:", err);
        }
    }
    if (thisSession !== state.feedSessionId) return;

    let page = parseInt(targetPage, 10);
    if (isNaN(page) || (state.paliFirstPage && page < state.paliFirstPage) || (state.paliLastPage && page > state.paliLastPage)) {
        page = state.paliFirstPage || 1;
    }

    state.feedLoadedPages.clear();
    state.feedFirstLoadedPage = page;
    state.feedLastLoadedPage = page;

    await loadPaliPage(bookId, page);
}

function cleanPeyala(html) {
    if (!html) return "";
    // ဆဋ္ဌမူစာအုပ် မူရင်းအတိုင်း အရင်စာပိုဒ်နှင့်တူသော အကျဉ်းချုံး ပေယျာလနေရာများ (...ပ..., ...ပေ..., …ပ…, …ပေ…) ကို "။ ပ ။" သို့ ပြောင်းလဲခြင်း
    return html.replace(/([^\s\.\…<]?)\s*(?:…|\.{2,})\s*(?:ပေ|ပ)\s*(?:…|\.{2,})\s*[၊။]?/g, (match, prefix) => {
        if (prefix === '။' || prefix === '၊') {
            return `${prefix} ။ ပ ။ `;
        } else if (prefix) {
            return `${prefix}။ ပ ။ `;
        } else {
            return `။ ပ ။ `;
        }
    }).replace(/[ \t]{2,}/g, " ");
}

function protectPaliWords(html) {
    if (!html) return "";
    // Clean any prior spans to be idempotent
    const unspanned = html
        .replace(/<span class="pali-word">([\s\S]*?)<\/span>/g, "$1")
        .replace(/<span class="no-split">([\s\S]*?)<\/span>/g, "$1");
        
    const parts = unspanned.split(/(<[^>]+>)/g);
    const symRegex = /^[\s\d၀-၉၊။,.\-—–“’”"'()\[\]<>:;?!/\\#*~`]+$/;
    
    return parts.map(part => {
        if (!part || part.startsWith("<")) return part;
        return part.replace(/\S+/g, (w) => {
            if (symRegex.test(w)) return w;
            if (w.length <= 35) {
                return `<span class="pali-word">${w}</span>`;
            } else {
                return w.replace(/([\u1000-\u1021\u1004\u103a]\u1039[\u1000-\u1021])/g, '<span class="no-split">$1</span>');
            }
        });
    }).join("");
}

function protectMyanmarConjuncts(html) {
    if (!html) return "";
    const unspanned = html.replace(/<span class="no-split">([\s\S]*?)<\/span>/g, "$1");
    const parts = unspanned.split(/(<[^>]+>)/g);
    return parts.map(part => {
        if (!part || part.startsWith("<")) return part;
        return part.replace(/([\u1000-\u1021\u1004\u103a]\u1039[\u1000-\u1021])/g, '<span class="no-split">$1</span>');
    }).join("");
}

function cleanGathaQuotes(text) {
    if (!text) return "";
    // 1. Opening quote at start of line / after leading HTML tags (anchor, span, etc.)
    let res = text.replace(/(^|^(?:<a\b[^>]*>.*?<\/a>|<span\b[^>]*>.*?<\/span>|\s)*)[\u201c\u201d\u2018\u2019"']+\s*/g, "$1");
    // 2. Closing quote before quotative endings 'တိ' or 'န္တိ' (iti)
    res = res.replace(/[\u201c\u201d\u2018\u2019"']+(?=(?:န္တိ|တိ)[၊။]?)/g, "");
    // 3. Quote before comma, section mark, or end of pada / tag
    res = res.replace(/[\u201c\u201d\u2018\u2019"']+(?=[,၊။]|\s*(?:<|$))/g, "");
    // 4. Quote immediately after punctuation (e.g. ။” -> ။ or ၊” -> ၊)
    res = res.replace(/([၊။])[\u201c\u201d\u2018\u2019"']+/g, "$1");
    return res;
}

function cleanPaliContent(html) {
    if (!html) return "";
    // ပေယျာလ အကျဉ်းချုံးများကို ဆဋ္ဌမူစာအုပ်အတိုင်း "။ ပ ။" အဖြစ် အရင်ပြောင်းလဲပါမည်
    const peyalaCleaned = cleanPeyala(html);

    const formatted = peyalaCleaned.replace(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi, (match, attrs, content) => {
        // ဂါထာပါဠိတော်များ (Gāthā) စာပိုဒ်များဖြစ်ပါက ဆဋ္ဌမူစာအုပ် မူရင်းပုံစံအတိုင်း:
        // ပထမ နှင့် တတိယ ပုဒ်အဆုံးတွင် ပုဒ်ထီး "၊" သုံးသည်
        // ဒုတိယ နှင့် စတုတ္ထ ပုဒ်အဆုံးတွင် ပုဒ်မ "။" သုံးသည်
        if (/\bclass\s*=\s*["'][^"']*gatha[^"']*["']/i.test(attrs)) {
            const clsMatch = attrs.match(/\bclass\s*=\s*["']([^"']+)["']/i);
            const clsName = clsMatch ? clsMatch[1].toLowerCase() : "";
            
            // If already wrapped in gatha-pada, preserve
            if (content.includes('<span class="gatha-pada')) {
                return `<p${attrs}>${content}</p>`;
            }

            // ၁။ ဂါထာစာကြောင်း အစရှိ မလိုအပ်သော space များကို ဖယ်ရှား၍ ညီညာစေပါမည်
            content = content.replace(/^\s+/, "");
            content = content.replace(/^((?:<a\b[^>]*>.*?<\/a>)*)\s+/, "$1");
            // ဆဋ္ဌမူစာအုပ် မူရင်းအတိုင်း ဂါထာအစ/အဆုံး quotation marks (‘‘, ’’, “, ”) များကို သန့်စင်ဖယ်ရှားပါမည်
            content = cleanGathaQuotes(content);

            // ၂။ အပုဒ်များ ခွဲခြားထားသော comma ပါဝင်ပါက တစ်ပါဒစီ ခွဲခြား wrap လုပ်ပါမည်
            if (/,+(?![^<]*>)/.test(content)) {
                const parts = content.split(/,(?![^<]*>)\s*/);
                const padas = parts.map((part, i) => {
                    let p = cleanGathaQuotes(part.trim());
                    if (i < parts.length - 1) {
                        p = p.replace(/[၊။]([’"”’'\s]*(?:<[^>]+>[’"”’'\s]*)*)$/, "၊$1");
                        if (!/[၊]([’"”’'\s]*(?:<[^>]+>[’"”’'\s]*)*)$/.test(p)) {
                            p = p + "၊";
                        }
                    } else {
                        p = p.replace(/[၊]([’"”’'\s]*(?:<[^>]+>[’"”’'\s]*)*)$/, "။$1");
                        if (!/[။]([’"”’'\s]*(?:<[^>]+>[’"”’'\s]*)*)$/.test(p)) {
                            p = p + "။";
                        }
                    }
                    p = cleanGathaQuotes(p);
                    return `<span class="gatha-pada pada${i + 1}">${p}</span>`;
                });
                return `<p${attrs}>${padas.join(" ")}</p>`;
            } else {
                let p = cleanGathaQuotes(content.trim());
                if (clsName.includes("gatha2") || clsName.includes("gatha4") || clsName.includes("gathalast")) {
                    p = p.replace(/၊([’"”’'\s]*(?:<[^>]+>[’"”’'\s]*)*)$/, "။$1");
                }
                p = cleanGathaQuotes(p);
                return `<p${attrs}><span class="gatha-pada">${p}</span></p>`;
            }
        }
        
        // စကားပြေ (Prose / Bodytext) တွင် မလိုအပ်သော English comma များကို ဖယ်ရှားပါမည်
        const cleaned = content.replace(/,(?![^<]*>)/g, "");
        return `<p${attrs}>${cleaned}</p>`;
    });

    // ၅။ စာကြောင်းအကူးအပြောင်းတွင် စာလုံးဆင့်များ ပြတ်တောက်၍ (+) မဖြစ်ပေါ်စေရန် ပါဠိစာလုံးများကို wrap ပြုလုပ်ပါမည်
    return protectPaliWords(formatted);
}

function cleanMMContent(html) {
    if (!html) return "";
    let res = cleanPeyala(html);
    res = res.replace(/။\s*ပ\s*။/g, "။ ပ ။ ").replace(/[ \t]{2,}/g, " ");
    return protectMyanmarConjuncts(res);
}

async function loadPaliPage(bookId, pageNum = null, highlightWord = null, isAppend = false, isPrepend = false) {
    state.paliBookId = bookId;
    let targetNum = parseInt(pageNum, 10);
    if (isNaN(targetNum)) {
        targetNum = state.paliFirstPage || 1;
    }
    if (!isAppend && !isPrepend && state.paliFirstPage && state.paliLastPage) {
        if (targetNum < state.paliFirstPage) targetNum = state.paliFirstPage;
        if (targetNum > state.paliLastPage) targetNum = state.paliLastPage;
    }
    
    let thisSession = state.feedSessionId;
    if (!isAppend && !isPrepend) {
        state.feedSessionId = (state.feedSessionId || 0) + 1;
        thisSession = state.feedSessionId;
        state.feedLoadedPages.clear();
        state.feedFirstLoadedPage = targetNum;
        state.feedLastLoadedPage = targetNum;

        if (state.readerMode !== "split") {
            el.paliContent.innerHTML = `<div class="loading-state">စာမျက်နှာ ဖွင့်လှစ်နေပါသည်...</div>`;
            el.pageNumberInput.value = targetNum;
            if (el.loadPrevBox) el.loadPrevBox.style.display = "none";
            if (el.infiniteSentinel) el.infiniteSentinel.style.display = "none";
        }
    }
    
    try {
        const res = await fetch(`/api/page/${bookId}/${targetNum}`);
        if (thisSession !== state.feedSessionId) return;
        const data = await res.json();
        
        state.paliFirstPage = data.first_page;
        state.paliLastPage = data.last_page;
        state.matchingMM = data.matching_mm;
        const actualPage = data.page;
        
        if (state.readerMode === "pali") {
            let html = cleanPaliContent(data.content);
            if (highlightWord) {
                const regex = new RegExp(`(${highlightWord})`, "gi");
                html = html.replace(regex, `<mark class="hit">$1</mark>`);
            }

            if (state.scrollMode === "feed") {
                if (!isAppend && !isPrepend) {
                    state.paliPage = actualPage;
                    state.feedLoadedPages.clear();
                    state.feedLoadedPages.add(actualPage);
                    state.feedFirstLoadedPage = actualPage;
                    state.feedLastLoadedPage = actualPage;

                    el.bookTitleDisplay.textContent = data.book_name;
                    el.chapterTitleDisplay.textContent = data.chapter_name || "";
                    el.totalPageDisplay.textContent = toMyanmarNum(data.last_page);
                    el.metaBookName.textContent = data.book_name;
                    el.metaPageNum.textContent = toMyanmarNum(actualPage);
                    el.footerCurrentPage.textContent = toMyanmarNum(actualPage);
                    el.footerTotalPage.textContent = toMyanmarNum(data.last_page);
                    el.pageNumberInput.value = actualPage;
                    el.pageNumberInput.min = data.first_page;
                    el.pageNumberInput.max = data.last_page;

                    el.btnPrevPage.disabled = !data.has_prev;
                    el.btnNextPage.disabled = !data.has_next;
                    el.btnFooterPrev.style.visibility = data.has_prev ? "visible" : "hidden";
                    el.btnFooterNext.style.visibility = data.has_next ? "visible" : "hidden";

                    el.paliContent.innerHTML = `
                        <section class="feed-page-item" id="pali-page-${actualPage}" data-page="${actualPage}">
                            ${html}
                        </section>
                    `;
                    el.readerContainer.scrollTop = 0;

                    if (el.loadPrevBox && el.loadPrevText) {
                        if (actualPage > data.first_page) {
                            el.loadPrevBox.style.display = "flex";
                            el.loadPrevText.textContent = `ယခင်စာမျက်နှာ (${toMyanmarNum(actualPage - 1)}) ကို ဆွဲယူရန်`;
                        } else {
                            el.loadPrevBox.style.display = "none";
                        }
                    }

                    if (el.infiniteSentinel) el.infiniteSentinel.style.display = "flex";
                    if (el.sentinelEnd) el.sentinelEnd.style.display = (actualPage >= data.last_page) ? "block" : "none";
                    if (el.sentinelLoading) el.sentinelLoading.style.display = "none";
                    if (el.pageScrollIndicator) el.pageScrollIndicator.style.display = "none";

                    setupSentinelObserver();
                    setupPageVisibilityObserver();
                    debounceRecent(bookId, actualPage);
                    updateBookmarkIconStatus();
                    highlightActiveToc(actualPage);
                } else if (isAppend) {
                    const loaded = getLoadedFeedPages();
                    const currentLast = loaded.length > 0 ? loaded[loaded.length - 1] : (data.first_page - 1);
                    if (loaded.length > 0 && actualPage !== currentLast + 1) {
                        console.warn(`Prevented non-sequential append: expected ${currentLast + 1}, got ${actualPage}`);
                        return;
                    }
                    if (document.getElementById(`pali-page-${actualPage}`)) {
                        return;
                    }
                    state.feedLoadedPages.add(actualPage);
                    state.feedLastLoadedPage = actualPage;

                    const chName = getCurrentChapterName("pali", actualPage);
                    const chPart = chName ? `<span class="badge-chapter">${escapeHtml(chName)}</span><span class="badge-sep">•</span>` : "";

                    const div = document.createElement("div");
                    div.className = "page-divider";
                    div.setAttribute("data-page", actualPage);
                    div.innerHTML = `
                        <div class="divider-line"></div>
                        <div class="divider-badge">
                            <span class="badge-icon">📖</span>
                            ${chPart}
                            <span class="badge-text">စာမျက်နှာ ${toMyanmarNum(actualPage)}</span>
                        </div>
                        <div class="divider-line"></div>
                    `;

                    const sec = document.createElement("section");
                    sec.className = "feed-page-item";
                    sec.id = `pali-page-${actualPage}`;
                    sec.setAttribute("data-page", actualPage);
                    sec.innerHTML = html;

                    el.paliContent.appendChild(div);
                    el.paliContent.appendChild(sec);

                    if (pageVisibilityObserver) pageVisibilityObserver.observe(sec);

                    if (actualPage >= data.last_page) {
                        if (el.sentinelEnd) el.sentinelEnd.style.display = "block";
                        if (el.sentinelLoading) el.sentinelLoading.style.display = "none";
                    }
                } else if (isPrepend) {
                    const loaded = getLoadedFeedPages();
                    const currentFirst = loaded.length > 0 ? loaded[0] : (data.last_page + 1);
                    if (loaded.length > 0 && actualPage !== currentFirst - 1) {
                        console.warn(`Prevented non-sequential prepend: expected ${currentFirst - 1}, got ${actualPage}`);
                        return;
                    }
                    if (document.getElementById(`pali-page-${actualPage}`)) {
                        return;
                    }
                    state.feedLoadedPages.add(actualPage);
                    state.feedFirstLoadedPage = actualPage;

                    const chNamePre = getCurrentChapterName("pali", actualPage + 1);
                    const chPartPre = chNamePre ? `<span class="badge-chapter">${escapeHtml(chNamePre)}</span><span class="badge-sep">•</span>` : "";

                    const div = document.createElement("div");
                    div.className = "page-divider";
                    div.setAttribute("data-page", actualPage + 1);
                    div.innerHTML = `
                        <div class="divider-line"></div>
                        <div class="divider-badge">
                            <span class="badge-icon">📖</span>
                            ${chPartPre}
                            <span class="badge-text">စာမျက်နှာ ${toMyanmarNum(actualPage + 1)}</span>
                        </div>
                        <div class="divider-line"></div>
                    `;

                    const sec = document.createElement("section");
                    sec.className = "feed-page-item";
                    sec.id = `pali-page-${actualPage}`;
                    sec.setAttribute("data-page", actualPage);
                    sec.innerHTML = html;

                    const oldScrollHeight = el.readerContainer.scrollHeight;
                    const oldScrollTop = el.readerContainer.scrollTop;

                    el.paliContent.insertBefore(div, el.paliContent.firstChild);
                    el.paliContent.insertBefore(sec, div);

                    const heightAdded = el.readerContainer.scrollHeight - oldScrollHeight;
                    el.readerContainer.scrollTop = oldScrollTop + heightAdded;

                    if (pageVisibilityObserver) pageVisibilityObserver.observe(sec);

                    if (el.loadPrevBox && el.loadPrevText) {
                        if (actualPage > data.first_page) {
                            el.loadPrevBox.style.display = "flex";
                            el.loadPrevText.textContent = `ယခင်စာမျက်နှာ (${toMyanmarNum(actualPage - 1)}) ကို ဆွဲယူရန်`;
                        } else {
                            el.loadPrevBox.style.display = "none";
                        }
                    }
                }
            } else {
                // Single page mode
                state.paliPage = actualPage;
                el.bookTitleDisplay.textContent = data.book_name;
                el.chapterTitleDisplay.textContent = data.chapter_name || "";
                el.totalPageDisplay.textContent = toMyanmarNum(data.last_page);
                el.metaBookName.textContent = data.book_name;
                el.metaPageNum.textContent = toMyanmarNum(actualPage);
                el.footerCurrentPage.textContent = toMyanmarNum(actualPage);
                el.footerTotalPage.textContent = toMyanmarNum(data.last_page);
                el.pageNumberInput.value = actualPage;
                el.pageNumberInput.min = data.first_page;
                el.pageNumberInput.max = data.last_page;
                
                el.btnPrevPage.disabled = !data.has_prev;
                el.btnNextPage.disabled = !data.has_next;
                el.btnFooterPrev.style.visibility = data.has_prev ? "visible" : "hidden";
                el.btnFooterNext.style.visibility = data.has_next ? "visible" : "hidden";
                
                el.paliContent.innerHTML = html;
                el.readerContainer.scrollTop = 0;
                
                if (el.loadPrevBox) el.loadPrevBox.style.display = "none";
                if (el.infiniteSentinel) el.infiniteSentinel.style.display = "none";
                updateScrollIndicator(actualPage, data.last_page);
                
                debounceRecent(bookId, actualPage);
                updateBookmarkIconStatus();
                highlightActiveToc(actualPage);
            }
        }

        // Update split view if open
        if (state.readerMode === "split") {
            state.paliPage = actualPage;
            state.paliBookName = data.book_name;
            if (el.splitPaliTitle) el.splitPaliTitle.textContent = data.book_name;
            if (el.splitPaliPageInput) {
                el.splitPaliPageInput.value = actualPage;
                el.splitPaliPageInput.min = data.first_page;
                el.splitPaliPageInput.max = data.last_page;
            }
            if (el.splitPaliTotalDisplay) el.splitPaliTotalDisplay.textContent = toMyanmarNum(data.last_page);
            if (el.btnSplitPaliPrev) el.btnSplitPaliPrev.disabled = !data.has_prev;
            if (el.btnSplitPaliNext) el.btnSplitPaliNext.disabled = !data.has_next;
            if (el.splitPaliContent) el.splitPaliContent.innerHTML = cleanPaliContent(data.content);
            
            // Sync matching Companion page (Attha, Tika, Mula, or MM)
            await syncSplitCompanionPane(bookId, actualPage);
            attachSplitViewParagraphListeners();
        }

    } catch (err) {
        console.error("Failed to load pali page:", err);
    }
}

// ----------------- Myanmar Translation Reader -----------------

async function loadMMBook(bookId, targetPage = null) {
    state.feedSessionId = (state.feedSessionId || 0) + 1;
    const thisSession = state.feedSessionId;

    if (state.mmBookId !== bookId || state.mmTocs.length === 0) {
        state.mmBookId = bookId;
        try {
            const res = await fetch(`/api/mm/book/${bookId}`);
            if (thisSession !== state.feedSessionId) return;
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
    if (thisSession !== state.feedSessionId) return;

    let page = parseInt(targetPage, 10);
    if (isNaN(page) || (state.mmFirstPage && page < state.mmFirstPage) || (state.mmLastPage && page > state.mmLastPage)) {
        page = state.mmFirstPage || 1;
    }

    state.feedLoadedPages.clear();
    state.feedFirstLoadedPage = page;
    state.feedLastLoadedPage = page;

    await loadMMPage(bookId, page);
}

async function loadMMPage(bookId, pageNum = null, isSplitRightPane = false, isAppend = false, isPrepend = false) {
    state.mmBookId = bookId;
    let targetNum = parseInt(pageNum, 10);
    if (isNaN(targetNum)) {
        targetNum = state.mmFirstPage || 1;
    }
    if (!isSplitRightPane && !isAppend && !isPrepend && state.mmFirstPage && state.mmLastPage) {
        if (targetNum < state.mmFirstPage) targetNum = state.mmFirstPage;
        if (targetNum > state.mmLastPage) targetNum = state.mmLastPage;
    }

    let thisSession = state.feedSessionId;
    if (!isSplitRightPane && !isAppend && !isPrepend && state.readerMode === "mm") {
        state.feedSessionId = (state.feedSessionId || 0) + 1;
        thisSession = state.feedSessionId;
        state.feedLoadedPages.clear();
        state.feedFirstLoadedPage = targetNum;
        state.feedLastLoadedPage = targetNum;

        el.paliContent.innerHTML = `<div class="loading-state">မြန်မာပြန် စာမျက်နှာ ဖွင့်လှစ်နေပါသည်...</div>`;
        el.pageNumberInput.value = targetNum;
        if (el.loadPrevBox) el.loadPrevBox.style.display = "none";
        if (el.infiniteSentinel) el.infiniteSentinel.style.display = "none";
    }

    try {
        const res = await fetch(`/api/mm/page/${bookId}/${targetNum}`);
        if (thisSession !== state.feedSessionId) return;
        const data = await res.json();
        if (data && data.content) data.content = cleanMMContent(data.content);

        state.mmFirstPage = data.first_page;
        state.mmLastPage = data.last_page;
        state.matchingPali = data.matching_pali;
        const actualPage = data.page;

        if (state.readerMode === "mm" && !isSplitRightPane) {
            if (state.scrollMode === "feed") {
                if (!isAppend && !isPrepend) {
                    state.mmPage = actualPage;
                    state.feedLoadedPages.clear();
                    state.feedLoadedPages.add(actualPage);
                    state.feedFirstLoadedPage = actualPage;
                    state.feedLastLoadedPage = actualPage;

                    el.bookTitleDisplay.textContent = data.book_name;
                    el.chapterTitleDisplay.textContent = data.chapter_name || "";
                    el.totalPageDisplay.textContent = toMyanmarNum(data.last_page);
                    el.metaBookName.textContent = data.book_name;
                    el.metaPageNum.textContent = toMyanmarNum(actualPage);
                    el.footerCurrentPage.textContent = toMyanmarNum(actualPage);
                    el.footerTotalPage.textContent = toMyanmarNum(data.last_page);
                    el.pageNumberInput.value = actualPage;
                    el.pageNumberInput.min = data.first_page;
                    el.pageNumberInput.max = data.last_page;

                    el.btnPrevPage.disabled = !data.has_prev;
                    el.btnNextPage.disabled = !data.has_next;
                    el.btnFooterPrev.style.visibility = data.has_prev ? "visible" : "hidden";
                    el.btnFooterNext.style.visibility = data.has_next ? "visible" : "hidden";

                    el.paliContent.innerHTML = `
                        <section class="feed-page-item" id="mm-page-${actualPage}" data-page="${actualPage}">
                            ${data.content}
                        </section>
                    `;
                    el.readerContainer.scrollTop = 0;

                    if (el.loadPrevBox && el.loadPrevText) {
                        if (actualPage > data.first_page) {
                            el.loadPrevBox.style.display = "flex";
                            el.loadPrevText.textContent = `ယခင်စာမျက်နှာ (${toMyanmarNum(actualPage - 1)}) ကို ဆွဲယူရန်`;
                        } else {
                            el.loadPrevBox.style.display = "none";
                        }
                    }

                    if (el.infiniteSentinel) el.infiniteSentinel.style.display = "flex";
                    if (el.sentinelEnd) el.sentinelEnd.style.display = (actualPage >= data.last_page) ? "block" : "none";
                    if (el.sentinelLoading) el.sentinelLoading.style.display = "none";
                    if (el.pageScrollIndicator) el.pageScrollIndicator.style.display = "none";

                    setupSentinelObserver();
                    setupPageVisibilityObserver();
                    highlightActiveToc(actualPage);
                    debounceRecent(bookId, actualPage);
                } else if (isAppend) {
                    const loaded = getLoadedFeedPages();
                    const currentLast = loaded.length > 0 ? loaded[loaded.length - 1] : (data.first_page - 1);
                    if (loaded.length > 0 && actualPage !== currentLast + 1) {
                        console.warn(`Prevented non-sequential append: expected ${currentLast + 1}, got ${actualPage}`);
                        return;
                    }
                    if (document.getElementById(`mm-page-${actualPage}`)) {
                        return;
                    }
                    state.feedLoadedPages.add(actualPage);
                    state.feedLastLoadedPage = actualPage;

                    const chName = getCurrentChapterName("mm", actualPage);
                    const chPart = chName ? `<span class="badge-chapter">${escapeHtml(chName)}</span><span class="badge-sep">•</span>` : "";

                    const div = document.createElement("div");
                    div.className = "page-divider";
                    div.setAttribute("data-page", actualPage);
                    div.innerHTML = `
                        <div class="divider-line"></div>
                        <div class="divider-badge">
                            <span class="badge-icon">📖</span>
                            ${chPart}
                            <span class="badge-text">စာမျက်နှာ ${toMyanmarNum(actualPage)}</span>
                        </div>
                        <div class="divider-line"></div>
                    `;

                    const sec = document.createElement("section");
                    sec.className = "feed-page-item";
                    sec.id = `mm-page-${actualPage}`;
                    sec.setAttribute("data-page", actualPage);
                    sec.innerHTML = data.content;

                    el.paliContent.appendChild(div);
                    el.paliContent.appendChild(sec);

                    if (pageVisibilityObserver) pageVisibilityObserver.observe(sec);

                    if (actualPage >= data.last_page) {
                        if (el.sentinelEnd) el.sentinelEnd.style.display = "block";
                        if (el.sentinelLoading) el.sentinelLoading.style.display = "none";
                    }
                } else if (isPrepend) {
                    const loaded = getLoadedFeedPages();
                    const currentFirst = loaded.length > 0 ? loaded[0] : (data.last_page + 1);
                    if (loaded.length > 0 && actualPage !== currentFirst - 1) {
                        console.warn(`Prevented non-sequential prepend: expected ${currentFirst - 1}, got ${actualPage}`);
                        return;
                    }
                    if (document.getElementById(`mm-page-${actualPage}`)) {
                        return;
                    }
                    state.feedLoadedPages.add(actualPage);
                    state.feedFirstLoadedPage = actualPage;

                    const chNamePre = getCurrentChapterName("mm", actualPage + 1);
                    const chPartPre = chNamePre ? `<span class="badge-chapter">${escapeHtml(chNamePre)}</span><span class="badge-sep">•</span>` : "";

                    const div = document.createElement("div");
                    div.className = "page-divider";
                    div.setAttribute("data-page", actualPage + 1);
                    div.innerHTML = `
                        <div class="divider-line"></div>
                        <div class="divider-badge">
                            <span class="badge-icon">📖</span>
                            ${chPartPre}
                            <span class="badge-text">စာမျက်နှာ ${toMyanmarNum(actualPage + 1)}</span>
                        </div>
                        <div class="divider-line"></div>
                    `;

                    const sec = document.createElement("section");
                    sec.className = "feed-page-item";
                    sec.id = `mm-page-${actualPage}`;
                    sec.setAttribute("data-page", actualPage);
                    sec.innerHTML = data.content;

                    const oldScrollHeight = el.readerContainer.scrollHeight;
                    const oldScrollTop = el.readerContainer.scrollTop;

                    el.paliContent.insertBefore(div, el.paliContent.firstChild);
                    el.paliContent.insertBefore(sec, div);

                    const heightAdded = el.readerContainer.scrollHeight - oldScrollHeight;
                    el.readerContainer.scrollTop = oldScrollTop + heightAdded;

                    if (pageVisibilityObserver) pageVisibilityObserver.observe(sec);

                    if (el.loadPrevBox && el.loadPrevText) {
                        if (actualPage > data.first_page) {
                            el.loadPrevBox.style.display = "flex";
                            el.loadPrevText.textContent = `ယခင်စာမျက်နှာ (${toMyanmarNum(actualPage - 1)}) ကို ဆွဲယူရန်`;
                        } else {
                            el.loadPrevBox.style.display = "none";
                        }
                    }
                }
            } else {
                // Single page mode
                state.mmPage = actualPage;
                el.bookTitleDisplay.textContent = data.book_name;
                el.chapterTitleDisplay.textContent = data.chapter_name || "";
                el.totalPageDisplay.textContent = toMyanmarNum(data.last_page);
                el.metaBookName.textContent = data.book_name;
                el.metaPageNum.textContent = toMyanmarNum(actualPage);
                el.footerCurrentPage.textContent = toMyanmarNum(actualPage);
                el.footerTotalPage.textContent = toMyanmarNum(data.last_page);
                el.pageNumberInput.value = actualPage;
                el.pageNumberInput.min = data.first_page;
                el.pageNumberInput.max = data.last_page;

                el.btnPrevPage.disabled = !data.has_prev;
                el.btnNextPage.disabled = !data.has_next;
                el.btnFooterPrev.style.visibility = data.has_prev ? "visible" : "hidden";
                el.btnFooterNext.style.visibility = data.has_next ? "visible" : "hidden";

                el.paliContent.innerHTML = data.content;
                el.readerContainer.scrollTop = 0;
                
                if (el.loadPrevBox) el.loadPrevBox.style.display = "none";
                if (el.infiniteSentinel) el.infiniteSentinel.style.display = "none";
                updateScrollIndicator(actualPage, data.last_page);

                highlightActiveToc(actualPage);
                debounceRecent(bookId, actualPage);
            }
        }

        if (isSplitRightPane || state.readerMode === "split") {
            state.mmBookId = data.book_id;
            state.mmBookName = data.book_name;
            state.mmPage = actualPage;
            state.mmFirstPage = data.first_page;
            state.mmLastPage = data.last_page;
            if (el.splitMMTitle) el.splitMMTitle.textContent = data.book_name;
            if (el.splitMMPageInput) {
                el.splitMMPageInput.value = actualPage;
                el.splitMMPageInput.min = data.first_page;
                el.splitMMPageInput.max = data.last_page;
            }
            if (el.splitMMTotalDisplay) el.splitMMTotalDisplay.textContent = toMyanmarNum(data.last_page);
            if (el.btnSplitMMPrev) el.btnSplitMMPrev.disabled = !data.has_prev;
            if (el.btnSplitMMNext) el.btnSplitMMNext.disabled = !data.has_next;
            if (el.splitMMContent) el.splitMMContent.innerHTML = cleanMMContent(data.content);
            if (el.bookTitleDisplay && state.readerMode === "split") {
                el.bookTitleDisplay.textContent = `${state.paliBookName || 'ပါဠိတော်'} ↔ ${data.book_name}`;
            }
            attachSplitViewParagraphListeners();
            if (state.readerMode === "split") {
                debounceRecent(state.paliBookId, state.paliPage);
            }
        }

    } catch (err) {
        console.error("Failed to load mm page:", err);
    }
}

// ----------------- Split View Logic & Dynamic Companion Tabs -----------------

async function renderSplitView() {
    el.bookTitleDisplay.textContent = `${state.paliBookName || 'ပါဠိတော်'} ↔ တွဲဖက်ကျမ်း`;
    el.chapterTitleDisplay.textContent = "ကျမ်းစာ ယှဉ်တွဲဖတ်ရှုခြင်း (Split View)";
    el.pageNumberInput.value = state.paliPage;
    el.totalPageDisplay.textContent = toMyanmarNum(state.paliLastPage || 1);

    // 1. Ensure companion metadata is loaded for current book
    if (!state.companionData || (state.companionData.current && state.companionData.current.id !== state.paliBookId)) {
        try {
            const res = await fetch(`/api/pali/companions/${state.paliBookId}`);
            if (res.ok) {
                state.companionData = await res.json();
                renderRelatedDropdown();
            }
        } catch (e) {
            console.error("Failed to load companion data:", e);
        }
    }

    // 2. Render dynamic companion tabs in right pane header
    renderCompanionTabs();

    // 3. Load left Pali page
    await loadPaliPage(state.paliBookId, state.paliPage);

    // 4. Sync right companion pane
    await syncSplitCompanionPane(state.paliBookId, state.paliPage);

    debounceRecent(state.paliBookId, state.paliPage);
}

function renderCompanionTabs() {
    const comp = state.companionData;
    if (!el.companionTabsBar) return;

    const availableTabs = [];
    if (comp) {
        if (comp.attha && comp.attha.length > 0) availableTabs.push({ type: "attha", label: "📖 အဋ္ဌကထာ", books: comp.attha });
        if (comp.tika && comp.tika.length > 0) availableTabs.push({ type: "tika", label: "📜 ဋီကာ", books: comp.tika });
        if (comp.mula && comp.mula.length > 0) availableTabs.push({ type: "mula", label: "☸️ မူလပါဠိ", books: comp.mula });
        if (comp.mm && comp.mm.length > 0) availableTabs.push({ type: "mm", label: "🇲🇲 မြန်မာပြန်", books: comp.mm });
    }

    if (availableTabs.length === 0) {
        availableTabs.push({ type: "mm", label: "🇲🇲 မြန်မာပြန်", books: [] });
    }

    // If current selected type is not available, pick first
    if (!availableTabs.some(t => t.type === state.splitRightType)) {
        state.splitRightType = availableTabs[0].type;
    }

    let tabsHtml = "";
    availableTabs.forEach(t => {
        const isActive = t.type === state.splitRightType;
        tabsHtml += `<button class="comp-tab ${isActive ? 'active' : ''}" data-type="${t.type}">${t.label}</button>`;
    });
    el.companionTabsBar.innerHTML = tabsHtml;

    // Attach click listeners to companion tabs
    el.companionTabsBar.querySelectorAll(".comp-tab").forEach(tab => {
        tab.addEventListener("click", async () => {
            const type = tab.getAttribute("data-type");
            if (type === state.splitRightType) return;
            state.splitRightType = type;
            state.splitRightBookId = null;
            localStorage.setItem("tipitaka_split_comp_type", type);
            renderCompanionTabs();
            await syncSplitCompanionPane(state.paliBookId, state.paliPage);
        });
    });

    updateCompanionVolumeSelector();
}

function updateCompanionVolumeSelector() {
    if (!el.compVolumeBox || !el.compVolumeSelect) return;
    const comp = state.companionData;
    if (!comp) {
        el.compVolumeBox.style.display = "none";
        return;
    }

    let books = [];
    if (state.splitRightType === "attha") books = comp.attha || [];
    else if (state.splitRightType === "tika") books = comp.tika || [];
    else if (state.splitRightType === "mula") books = comp.mula || [];
    else if (state.splitRightType === "mm") books = comp.mm || [];

    if (books.length <= 1) {
        el.compVolumeBox.style.display = "none";
        return;
    }

    el.compVolumeBox.style.display = "inline-flex";
    let optHtml = "";
    books.forEach(b => {
        const isSelected = (b.id === state.splitRightBookId);
        optHtml += `<option value="${b.id}" ${isSelected ? 'selected' : ''}>${escapeHtml(b.name)}</option>`;
    });
    el.compVolumeSelect.innerHTML = optHtml;

    // Remove old listeners by cloning
    const newSelect = el.compVolumeSelect.cloneNode(true);
    el.compVolumeSelect.parentNode.replaceChild(newSelect, el.compVolumeSelect);
    el.compVolumeSelect = newSelect;

    el.compVolumeSelect.addEventListener("change", async (e) => {
        state.splitRightBookId = e.target.value;
        await syncSplitCompanionPane(state.paliBookId, state.paliPage, state.splitRightBookId);
    });
}

async function openSplitCompanion(compType, compId) {
    state.splitRightType = compType;
    state.splitRightBookId = compId;
    localStorage.setItem("tipitaka_split_comp_type", compType);
    setReaderMode("split");
}

async function syncSplitCompanionPane(sourceBook, sourcePage, specificTargetBook = null) {
    if (state.readerMode !== "split") return;

    const comp = state.companionData;
    const type = state.splitRightType || "attha";
    let candidateBooks = [];

    if (specificTargetBook) {
        candidateBooks = [specificTargetBook];
    } else if (comp) {
        if (type === "attha" && comp.attha) candidateBooks = comp.attha.map(b => b.id);
        else if (type === "tika" && comp.tika) candidateBooks = comp.tika.map(b => b.id);
        else if (type === "mula" && comp.mula) candidateBooks = comp.mula.map(b => b.id);
        else if (type === "mm" && comp.mm) candidateBooks = comp.mm.map(b => b.id);
    }

    if (candidateBooks.length === 0) {
        if (type === "mm" && state.mmBookId) candidateBooks = [state.mmBookId];
    }

    const targetTypeParam = (type === "mm") ? "mm" : "pali";
    const targetBooksParam = candidateBooks.join(",");

    try {
        const url = `/api/match/pali_to_companion?source_book=${encodeURIComponent(sourceBook)}&source_page=${sourcePage}&target_type=${targetTypeParam}&target_books=${encodeURIComponent(targetBooksParam)}`;
        const res = await fetch(url);
        if (res.ok) {
            const matchData = await res.json();
            const targetBid = matchData.target_book || (candidateBooks.length > 0 ? candidateBooks[0] : null);
            const targetPg = matchData.target_page || 1;

            if (targetBid) {
                state.splitRightBookId = targetBid;
                state.splitRightPage = targetPg;

                if (el.compVolumeSelect) {
                    el.compVolumeSelect.value = targetBid;
                }

                await loadSplitRightPage(targetBid, targetPg, type, matchData.matched_para);
            }
        }
    } catch (err) {
        console.error("Failed to sync companion pane:", err);
    }
}

async function loadSplitRightPage(bookId, pageNum, type, matchedPara = null) {
    if (!el.splitRightContent) return;

    if (type === "mm") {
        try {
            const res = await fetch(`/api/mm/page/${bookId}/${pageNum}`);
            if (res.ok) {
                const data = await res.json();
                state.splitRightBookName = data.book_name;
                state.splitRightPage = data.page;
                state.splitRightLastPage = data.last_page;

                if (el.splitRightPageInput) {
                    el.splitRightPageInput.value = data.page;
                    el.splitRightPageInput.min = data.first_page;
                    el.splitRightPageInput.max = data.last_page;
                }
                if (el.splitRightTotalDisplay) el.splitRightTotalDisplay.textContent = toMyanmarNum(data.last_page);
                if (el.btnSplitRightPrev) el.btnSplitRightPrev.disabled = !data.has_prev;
                if (el.btnSplitRightNext) el.btnSplitRightNext.disabled = !data.has_next;

                el.splitRightContent.className = "split-pane-body mm-content";
                el.splitRightContent.innerHTML = cleanMMContent(data.content);

                attachSplitViewParagraphListeners();

                if (matchedPara) {
                    highlightMatchingParagraphInRight(matchedPara);
                }
            }
        } catch (e) {
            console.error("Failed to load MM companion page:", e);
        }
    } else {
        try {
            const res = await fetch(`/api/page/${bookId}/${pageNum}`);
            if (res.ok) {
                const data = await res.json();
                state.splitRightBookName = data.book_name;
                state.splitRightPage = data.page;
                state.splitRightLastPage = data.last_page;

                if (el.splitRightPageInput) {
                    el.splitRightPageInput.value = data.page;
                    el.splitRightPageInput.min = data.first_page;
                    el.splitRightPageInput.max = data.last_page;
                }
                if (el.splitRightTotalDisplay) el.splitRightTotalDisplay.textContent = toMyanmarNum(data.last_page);
                if (el.btnSplitRightPrev) el.btnSplitRightPrev.disabled = !data.has_prev;
                if (el.btnSplitRightNext) el.btnSplitRightNext.disabled = !data.has_next;

                el.splitRightContent.className = "split-pane-body pali-content";
                el.splitRightContent.innerHTML = cleanPaliContent(data.content);

                attachSplitViewParagraphListeners();

                if (matchedPara) {
                    highlightMatchingParagraphInRight(matchedPara);
                }
            }
        } catch (e) {
            console.error("Failed to load Pali companion page:", e);
        }
    }
}

function highlightMatchingParagraphInRight(paraNum) {
    if (!el.splitRightContent) return;
    const numStr = toMyanmarNum(paraNum);
    let target = el.splitRightContent.querySelector(`a[name="para${paraNum}"]`);
    if (!target) {
        const markers = el.splitRightContent.querySelectorAll(".paranum, .hangnum, .paragraph");
        for (const m of markers) {
            if (m.textContent.includes(numStr) || fromMyanmarNum(m.textContent.trim()) === paraNum) {
                target = m;
                break;
            }
        }
    }
    if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        const p = target.closest("p") || target;
        p.classList.add("para-highlight-pulse");
        setTimeout(() => p.classList.remove("para-highlight-pulse"), 2400);
    }
}

function attachSplitViewParagraphListeners() {
    if (state.readerMode !== "split") return;

    // 1. Click on Pali paragraph marker in left pane to jump/scroll in right pane
    if (el.splitPaliContent) {
        el.splitPaliContent.querySelectorAll(".paranum, .hangnum, a[name^='para']").forEach(elem => {
            elem.style.cursor = "pointer";
            elem.title = "ကလစ်နှိပ်ပါက ညာဘက်တွဲဖက်ကျမ်းရှိ ဤအပိုဒ်သို့ တိုက်ရိုက်ရွေ့ပါမည်";
            elem.onclick = (e) => {
                e.stopPropagation();
                let text = elem.textContent.trim();
                let num = fromMyanmarNum(text);
                if (!num && elem.name) {
                    const m = elem.name.match(/\d+/);
                    if (m) num = parseInt(m[0], 10);
                }
                if (!num && elem.querySelector) {
                    const pn = elem.querySelector(".paranum");
                    if (pn) num = fromMyanmarNum(pn.textContent.trim());
                }
                if (num) {
                    if (state.splitRightType === "mm") {
                        scrollToMatchingMMParagraph(num);
                    } else {
                        scrollToMatchingPaliCompanionParagraph(num);
                    }
                }
            };
        });
    }

    // 2. Click on paragraph number in right pane to jump/scroll to matching Left Pali text
    if (el.splitRightContent) {
        el.splitRightContent.querySelectorAll(".paranum, .hangnum, .paragraph, a[name^='para']").forEach(elem => {
            elem.style.cursor = "pointer";
            elem.title = "ကလစ်နှိပ်ပါက ဘယ်ဘက်ပါဠိတော်ရှိ ဤအပိုဒ်သို့ တိုက်ရိုက်ရွေ့ပါမည်";
            elem.onclick = (e) => {
                e.stopPropagation();
                let text = elem.textContent.trim();
                let num = fromMyanmarNum(text);
                if (!num && elem.name) {
                    const m = elem.name.match(/\d+/);
                    if (m) num = parseInt(m[0], 10);
                }
                if (!num && elem.querySelector) {
                    const pn = elem.querySelector(".paranum");
                    if (pn) num = fromMyanmarNum(pn.textContent.trim());
                }
                if (num) {
                    scrollToMatchingPaliParagraph(num);
                }
            };
        });
    }
}

async function scrollToMatchingPaliCompanionParagraph(paraNum) {
    if (!el.splitRightContent) return;
    const numStr = toMyanmarNum(paraNum);

    let target = el.splitRightContent.querySelector(`a[name="para${paraNum}"]`);
    if (!target) {
        const markers = el.splitRightContent.querySelectorAll(".paranum, .hangnum");
        for (const m of markers) {
            if (m.textContent.includes(numStr) || fromMyanmarNum(m.textContent.trim()) === paraNum) {
                target = m;
                break;
            }
        }
    }

    if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        const p = target.closest("p") || target;
        p.classList.add("para-highlight-pulse");
        setTimeout(() => p.classList.remove("para-highlight-pulse"), 2400);
        showScrollToast(`တွဲဖက်ကျမ်း အပိုဒ် (${numStr}) သို့ ရွေ့ပြီးပါပြီ`);
        return;
    }

    try {
        const res = await fetch(`/api/match/para_to_page?pali_book_id=${state.splitRightBookId}&para=${paraNum}`);
        if (res.ok) {
            const data = await res.json();
            if (data.pali_page) {
                showScrollToast(`တွဲဖက်ကျမ်း စာမျက်နှာ ${toMyanmarNum(data.pali_page)} (အပိုဒ် ${numStr}) သို့ ပြောင်းနေပါသည်...`);
                await loadSplitRightPage(state.splitRightBookId, data.pali_page, state.splitRightType, paraNum);
            }
        }
    } catch (e) {
        console.error("Failed to match para to companion page:", e);
    }
}

async function scrollToMatchingMMParagraph(paraNum) {
    if (!el.splitRightContent) return;
    const mmNumStr = toMyanmarNum(paraNum);

    let target = null;
    const spans = el.splitRightContent.querySelectorAll(".paragraph");
    for (const s of spans) {
        if (s.textContent.trim() === mmNumStr || fromMyanmarNum(s.textContent.trim()) === paraNum) {
            target = s;
            break;
        }
    }

    if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        const parentP = target.closest("p") || target;
        parentP.classList.add("para-highlight-pulse");
        setTimeout(() => parentP.classList.remove("para-highlight-pulse"), 2400);
        showScrollToast(`မြန်မာပြန် အပိုဒ် (${mmNumStr}) သို့ ရွေ့ပြီးပါပြီ`);
        return;
    }

    try {
        const res = await fetch(`/api/match/para_to_page?pali_book_id=${state.paliBookId}&mm_book_id=${state.splitRightBookId || state.mmBookId}&para=${paraNum}`);
        if (res.ok) {
            const data = await res.json();
            if (data.mm_page) {
                showScrollToast(`မြန်မာပြန် စာမျက်နှာ ${toMyanmarNum(data.mm_page)} (အပိုဒ် ${mmNumStr}) သို့ ပြောင်းနေပါသည်...`);
                await loadSplitRightPage(data.mm_book_id || state.splitRightBookId || state.mmBookId, data.mm_page, "mm", paraNum);
            }
        }
    } catch (e) {
        console.error("Failed to match para to mm page:", e);
    }
}

async function scrollToMatchingPaliParagraph(paraNum) {
    if (!el.splitPaliContent) return;
    const mmNumStr = toMyanmarNum(paraNum);

    let target = el.splitPaliContent.querySelector(`a[name="para${paraNum}"]`);
    if (!target) {
        const spans = el.splitPaliContent.querySelectorAll(".paranum");
        for (const s of spans) {
            if (s.textContent.trim() === mmNumStr || fromMyanmarNum(s.textContent.trim()) === paraNum) {
                target = s;
                break;
            }
        }
    }

    if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        const parentP = target.closest("p") || target;
        parentP.classList.add("para-highlight-pulse");
        setTimeout(() => parentP.classList.remove("para-highlight-pulse"), 2400);
        showScrollToast(`ပါဠိတော် အပိုဒ် (${mmNumStr}) သို့ ရွေ့ပြီးပါပြီ`);
        return;
    }

    try {
        const res = await fetch(`/api/match/para_to_page?pali_book_id=${state.paliBookId}&para=${paraNum}`);
        if (res.ok) {
            const data = await res.json();
            if (data.pali_page) {
                showScrollToast(`ပါဠိတော် စာမျက်နှာ ${toMyanmarNum(data.pali_page)} (အပိုဒ် ${mmNumStr}) သို့ ပြောင်းနေပါသည်...`);
                await loadPaliPage(data.pali_book_id || state.paliBookId, data.pali_page);
                setTimeout(() => {
                    if (el.splitPaliContent) {
                        let newTarget = el.splitPaliContent.querySelector(`a[name="para${paraNum}"]`);
                        if (!newTarget) {
                            const spans = el.splitPaliContent.querySelectorAll(".paranum");
                            for (const s of spans) {
                                if (s.textContent.trim() === mmNumStr || fromMyanmarNum(s.textContent.trim()) === paraNum) {
                                    newTarget = s;
                                    break;
                                }
                            }
                        }
                        if (newTarget) {
                            newTarget.scrollIntoView({ behavior: "smooth", block: "center" });
                            const p = newTarget.closest("p") || newTarget;
                            p.classList.add("para-highlight-pulse");
                            setTimeout(() => p.classList.remove("para-highlight-pulse"), 2400);
                        }
                    }
                }, 150);
            }
        }
    } catch (e) {
        console.error("Failed to match para to pali page:", e);
    }
}

async function handleSplitSync() {
    showScrollToast("တွဲဖက်ကျမ်းစာနှင့် ပြန်လည်ချိန်ညှိနေပါသည်...");
    await syncSplitCompanionPane(state.paliBookId, state.paliPage);
    showScrollToast("တွဲဖက်ကျမ်းစာ ပြန်လည်ချိန်ညှိပြီးပါပြီ ✨");
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

// ----------------- Focus / Fullscreen Mode Controller -----------------

function toggleFocusBars(forceState) {
    if (!state.isFocusMode) return;
    const isRevealed = (typeof forceState === "boolean")
        ? forceState
        : !document.body.classList.contains("focus-bars-revealed");
    document.body.classList.toggle("focus-bars-revealed", isRevealed);
}

async function toggleFocusMode(enable) {
    if (typeof enable !== "boolean") {
        enable = !state.isFocusMode;
    }
    state.isFocusMode = enable;
    document.body.classList.toggle("focus-mode", enable);
    if (!enable) {
        document.body.classList.remove("focus-bars-revealed");
    } else {
        // Automatically close sidebars and drawers when entering focus mode
        if (state.isSidebarOpen) toggleSidebar(false);
        if (state.isDictOpen) toggleDictSidebar(false);
        closeSidebarMobile();
    }

    // Update icons & tooltips
    if (el.btnToggleFullscreen) {
        el.btnToggleFullscreen.title = enable 
            ? "ပုံမှန်မြင်ကွင်းသို့ ပြန်သွားရန် (Esc / Focus Mode)" 
            : "မျက်နှာပြင်ပြည့် / အာရုံစူးစိုက်ဖတ်ရှုရန် (Focus Mode - F11)";
        el.btnToggleFullscreen.classList.toggle("active", enable);
    }
    if (el.btnToggleFullscreenMobile) {
        el.btnToggleFullscreenMobile.classList.toggle("active", enable);
    }
    if (el.fullscreenIcon) {
        if (enable) {
            // Compress icon
            el.fullscreenIcon.innerHTML = `<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>`;
        } else {
            // Expand icon
            el.fullscreenIcon.innerHTML = `<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>`;
        }
    }
    if (el.fullscreenMobileLabel) {
        el.fullscreenMobileLabel.textContent = enable 
            ? "ပုံမှန်မြင်ကွင်းသို့ ပြန်သွားရန်" 
            : "မျက်နှာပြင်ပြည့် ဖတ်ရှုရန် (Focus Mode)";
    }

    // Trigger HTML5 Fullscreen API
    try {
        const docEl = document.documentElement;
        if (enable) {
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                if (docEl.requestFullscreen) {
                    await docEl.requestFullscreen();
                } else if (docEl.webkitRequestFullscreen) {
                    await docEl.webkitRequestFullscreen();
                }
            }
        } else {
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    await document.webkitExitFullscreen();
                }
            }
        }
    } catch (err) {
        console.warn("Fullscreen API note:", err);
    }
}

// ----------------- App View Controller (Home vs Reader) -----------------

function switchToSidebarTab(tabId) {
    if (!el.sidebarTabBtns || !el.sidebarPanels) return;
    el.sidebarTabBtns.forEach(b => b.classList.toggle("active", b.getAttribute("data-tab") === tabId));
    el.sidebarPanels.forEach(p => p.classList.toggle("active", p.id === tabId));
    state.activeTab = tabId;
}

function setAppView(view) {
    state.appView = view;

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

        // On desktop/tablets (> 992px), open sidebar and activate TOC tab by default!
        if (window.innerWidth > 992) {
            state.isSidebarOpen = true;
            if (el.appSidebar) el.appSidebar.classList.remove("collapsed");
            localStorage.setItem("tipitaka_sidebar_open", "1");
            switchToSidebarTab("tab-toc");
            const curPg = (state.readerMode === "mm") ? state.mmPage : state.paliPage;
            highlightActiveToc(curPg, true);
        } else {
            // On mobile, ensure TOC tab is active inside the drawer
            switchToSidebarTab("tab-toc");
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
        row.addEventListener("click", async () => {
            const bId = row.getAttribute("data-id");
            if (state.readerMode === "mm") {
                await loadMMBook(bId, null);
            } else {
                await loadPaliBook(bId, null);
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
        btn.addEventListener("click", async () => {
            const bId = btn.getAttribute("data-id");
            if (state.readerMode === "mm") {
                await loadMMBook(bId, null);
            } else {
                await loadPaliBook(bId, null);
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
                <span class="toc-item-title-wrapper">
                    <span class="toc-bullet-icon"></span>
                    <span class="toc-text">${escapeHtml(t.name)}</span>
                </span>
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

    const curPg = (state.readerMode === "mm") ? state.mmPage : state.paliPage;
    highlightActiveToc(curPg, false);
}

function highlightActiveToc(currentPg, shouldScroll = false) {
    if (!el.tocList) return;
    const mode = (state.readerMode === "mm") ? "mm" : "pali";
    const tocs = (mode === "mm") ? state.mmTocs : state.paliTocs;
    const lastPage = (mode === "mm") ? state.mmLastPage : state.paliLastPage;
    
    if (!tocs || tocs.length === 0) {
        if (el.tocCurrentCard) el.tocCurrentCard.style.display = "none";
        if (el.mobileChapterBreadcrumb) {
            const bookName = (mode === "mm") ? (state.mmBookName || "မြန်မာပြန်") : (state.paliBookName || "ပါဠိတော်");
            if (el.mobileBreadcrumbBook) el.mobileBreadcrumbBook.textContent = bookName;
            if (el.mobileBreadcrumbChapter) el.mobileBreadcrumbChapter.textContent = "";
            if (el.mobileBreadcrumbPage) el.mobileBreadcrumbPage.textContent = `စာ-${toMyanmarNum(currentPg)}`;
        }
        return;
    }

    if (el.tocCurrentCard) el.tocCurrentCard.style.display = "block";

    let activeIndex = -1;
    for (let i = 0; i < tocs.length; i++) {
        if (tocs[i].page_number <= currentPg) {
            activeIndex = i;
        } else {
            break;
        }
    }

    const activeTocObj = (activeIndex >= 0) ? tocs[activeIndex] : tocs[0];
    const nextTocObj = (activeIndex >= 0 && activeIndex < tocs.length - 1) ? tocs[activeIndex + 1] : null;

    // Page range of this section/chapter
    let startPg = activeTocObj ? activeTocObj.page_number : 1;
    let endPg = nextTocObj ? (nextTocObj.page_number - 1) : (lastPage || currentPg);
    if (endPg < startPg) endPg = startPg;

    // 1. Update the Sticky Current Reading Chapter Tracker Card
    if (el.tocCurrentTitle && activeTocObj) {
        el.tocCurrentTitle.textContent = activeTocObj.name;
    }
    if (el.tocCurrentPagePill) {
        el.tocCurrentPagePill.textContent = `စာမျက်နှာ ${toMyanmarNum(currentPg)}`;
    }
    if (el.tocCurrentRange) {
        if (startPg === endPg) {
            el.tocCurrentRange.textContent = `စာမျက်နှာ ${toMyanmarNum(startPg)} (ကျမ်းစာမျက်နှာ ${toMyanmarNum(currentPg)} / ${toMyanmarNum(lastPage || 381)})`;
        } else {
            el.tocCurrentRange.textContent = `စာမျက်နှာ ${toMyanmarNum(startPg)} မှ ${toMyanmarNum(endPg)} အထိ (ကျမ်းစာမျက်နှာ ${toMyanmarNum(currentPg)} / ${toMyanmarNum(lastPage || 381)})`;
        }
    }

    // 2. Update Mobile Chapter Breadcrumb
    if (el.mobileChapterBreadcrumb) {
        const bookName = (mode === "mm") ? (state.mmBookName || "မြန်မာပြန်") : (state.paliBookName || "ပါဠိတော်");
        if (el.mobileBreadcrumbBook) el.mobileBreadcrumbBook.textContent = bookName;
        if (el.mobileBreadcrumbChapter && activeTocObj) el.mobileBreadcrumbChapter.textContent = activeTocObj.name;
        if (el.mobileBreadcrumbPage) el.mobileBreadcrumbPage.textContent = `စာ-${toMyanmarNum(currentPg)}`;
    }

    // 3. Highlight the active button in the TOC list
    let activeBtn = null;
    const allBtns = el.tocList.querySelectorAll(".toc-item-btn");
    allBtns.forEach(btn => {
        const p = parseInt(btn.getAttribute("data-page"), 10);
        btn.classList.remove("active");
        const badge = btn.querySelector(".item-page-badge");
        if (badge) {
            badge.textContent = `စာ-${p}`;
        }
        if (p <= currentPg) {
            activeBtn = btn;
        }
    });

    if (activeBtn) {
        activeBtn.classList.add("active");
        const badge = activeBtn.querySelector(".item-page-badge");
        if (badge) {
            const orgPage = activeBtn.getAttribute("data-page");
            badge.textContent = `စာ-${orgPage} (လက်ရှိ စာ-${toMyanmarNum(currentPg)})`;
        }
        if (shouldScroll) {
            activeBtn.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
    }

    // 4. Update the Top Header chapter title
    if (activeTocObj && el.chapterTitleDisplay) {
        el.chapterTitleDisplay.textContent = activeTocObj.name;
    }

    // 5. Also sync Sutta tab if available
    highlightActiveSutta(currentPg);
}

function highlightActiveSutta(currentPg) {
    if (!el.suttaList) return;
    let activeSuttaBtn = null;
    el.suttaList.querySelectorAll(".sutta-item-btn").forEach(btn => {
        const p = parseInt(btn.getAttribute("data-page"), 10);
        btn.classList.remove("active");
        if (p <= currentPg) {
            activeSuttaBtn = btn;
        }
    });
    if (activeSuttaBtn) {
        activeSuttaBtn.classList.add("active");
    }
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
                <span class="sutta-item-title-wrapper">
                    <span class="toc-bullet-icon"></span>
                    <span>${escapeHtml(s.name)} ${s.sutta_id ? `(${escapeHtml(s.sutta_id)})` : ''}</span>
                </span>
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

    const curPg = (state.readerMode === "mm") ? state.mmPage : state.paliPage;
    highlightActiveSutta(curPg);
}

function renderRelatedDropdown() {
    const comp = state.companionData;
    const hasCompanions = comp && (
        (comp.attha && comp.attha.length > 0) ||
        (comp.tika && comp.tika.length > 0) ||
        (comp.mula && comp.mula.length > 0) ||
        (comp.mm && comp.mm.length > 0)
    );

    if (!hasCompanions && (!state.paliRelated || state.paliRelated.length === 0)) {
        if (el.relatedDropdownWrapper) el.relatedDropdownWrapper.style.display = "none";
        if (el.mobileCompanionRow) el.mobileCompanionRow.style.display = "none";
        return;
    }

    if (el.relatedDropdownWrapper) el.relatedDropdownWrapper.style.display = "block";
    if (el.mobileCompanionRow) el.mobileCompanionRow.style.display = "block";

    let html = "";

    // 1. အဋ္ဌကထာ (Commentary)
    if (comp && comp.attha && comp.attha.length > 0) {
        html += `
            <div class="comp-group">
                <div class="comp-group-label">
                    <span>📖 အဋ္ဌကထာ (Commentary)</span>
                    <span class="comp-group-badge">${toMyanmarNum(comp.attha.length)} အုပ်</span>
                </div>
        `;
        comp.attha.forEach(b => {
            html += `
                <div class="comp-card-item">
                    <div class="comp-card-header">
                        <span class="comp-card-title">${escapeHtml(b.name)}</span>
                    </div>
                    <div class="comp-card-actions">
                        <button class="comp-btn-split" data-comp-type="attha" data-id="${b.id}" title="လက်ရှိကျမ်းစာနှင့် ယှဉ်တွဲဖတ်ရှုရန်">
                            <span>📖 ယှဉ်တွဲဖတ်မည်</span>
                        </button>
                        <button class="comp-btn-goto" data-id="${b.id}" title="ဤကျမ်းစာအုပ်သို့ တိုက်ရိုက်ကူးပြောင်းရန်">
                            <span>➔ ဖတ်မည်</span>
                        </button>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    }

    // 2. ဋီကာ (Sub-commentary)
    if (comp && comp.tika && comp.tika.length > 0) {
        html += `
            <div class="comp-group">
                <div class="comp-group-label">
                    <span>📜 ဋီကာ (Sub-commentary)</span>
                    <span class="comp-group-badge">${toMyanmarNum(comp.tika.length)} အုပ်</span>
                </div>
        `;
        comp.tika.forEach(b => {
            html += `
                <div class="comp-card-item">
                    <div class="comp-card-header">
                        <span class="comp-card-title">${escapeHtml(b.name)}</span>
                    </div>
                    <div class="comp-card-actions">
                        <button class="comp-btn-split" data-comp-type="tika" data-id="${b.id}" title="လက်ရှိကျမ်းစာနှင့် ယှဉ်တွဲဖတ်ရှုရန်">
                            <span>📖 ယှဉ်တွဲဖတ်မည်</span>
                        </button>
                        <button class="comp-btn-goto" data-id="${b.id}" title="ဤကျမ်းစာအုပ်သို့ တိုက်ရိုက်ကူးပြောင်းရန်">
                            <span>➔ ဖတ်မည်</span>
                        </button>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    }

    // 3. ပါဠိတော်မူလ (Mūla - when on Attha/Tika)
    if (comp && comp.mula && comp.mula.length > 0) {
        html += `
            <div class="comp-group">
                <div class="comp-group-label">
                    <span>☸️ မူလပါဠိတော်</span>
                    <span class="comp-group-badge">${toMyanmarNum(comp.mula.length)} အုပ်</span>
                </div>
        `;
        comp.mula.forEach(b => {
            html += `
                <div class="comp-card-item">
                    <div class="comp-card-header">
                        <span class="comp-card-title">${escapeHtml(b.name)}</span>
                    </div>
                    <div class="comp-card-actions">
                        <button class="comp-btn-split" data-comp-type="mula" data-id="${b.id}" title="လက်ရှိကျမ်းစာနှင့် ယှဉ်တွဲဖတ်ရှုရန်">
                            <span>📖 ယှဉ်တွဲဖတ်မည်</span>
                        </button>
                        <button class="comp-btn-goto" data-id="${b.id}" title="ဤကျမ်းစာအုပ်သို့ တိုက်ရိုက်ကူးပြောင်းရန်">
                            <span>➔ ဖတ်မည်</span>
                        </button>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    }

    // 4. မြန်မာပြန် (Translation)
    if (comp && comp.mm && comp.mm.length > 0) {
        html += `
            <div class="comp-group">
                <div class="comp-group-label">
                    <span>🇲🇲 မြန်မာပြန်</span>
                    <span class="comp-group-badge">${toMyanmarNum(comp.mm.length)} အုပ်</span>
                </div>
        `;
        comp.mm.forEach(b => {
            html += `
                <div class="comp-card-item">
                    <div class="comp-card-header">
                        <span class="comp-card-title">${escapeHtml(b.name)}</span>
                    </div>
                    <div class="comp-card-actions">
                        <button class="comp-btn-split" data-comp-type="mm" data-id="${b.id}" title="လက်ရှိကျမ်းစာနှင့် ယှဉ်တွဲဖတ်ရှုရန်">
                            <span>📖 ယှဉ်တွဲဖတ်မည်</span>
                        </button>
                        <button class="comp-btn-goto-mm" data-id="${b.id}" title="မြန်မာပြန်ကျမ်းစာသို့ တိုက်ရိုက်ကူးပြောင်းရန်">
                            <span>➔ ဖတ်မည်</span>
                        </button>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    }

    // Fallback if only legacy related items
    if (!html && state.paliRelated && state.paliRelated.length > 0) {
        state.paliRelated.forEach(r => {
            const label = r.rel_type === "root" ? "ပါဠိတော်မူလ" : "အဋ္ဌကထာ/ဋီကာ";
            html += `
                <div class="comp-card-item">
                    <div class="comp-card-header">
                        <span class="comp-card-title">${escapeHtml(r.name)}</span>
                        <small style="color:var(--text-muted);">${label}</small>
                    </div>
                    <div class="comp-card-actions">
                        <button class="comp-btn-split" data-comp-type="attha" data-id="${r.id}">
                            <span>📖 ယှဉ်တွဲဖတ်မည်</span>
                        </button>
                        <button class="comp-btn-goto" data-id="${r.id}">
                            <span>➔ ဖတ်မည်</span>
                        </button>
                    </div>
                </div>
            `;
        });
    }

    el.relatedList.innerHTML = html;

    // Attach click events
    el.relatedList.querySelectorAll(".comp-btn-split").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const compType = btn.getAttribute("data-comp-type") || "attha";
            const compId = btn.getAttribute("data-id");
            if (el.relatedDropdownWrapper) el.relatedDropdownWrapper.classList.remove("open");
            openSplitCompanion(compType, compId);
        });
    });

    el.relatedList.querySelectorAll(".comp-btn-goto").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const relId = btn.getAttribute("data-id");
            if (el.relatedDropdownWrapper) el.relatedDropdownWrapper.classList.remove("open");
            loadPaliBook(relId, null);
        });
    });

    el.relatedList.querySelectorAll(".comp-btn-goto-mm").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const mmId = btn.getAttribute("data-id");
            if (el.relatedDropdownWrapper) el.relatedDropdownWrapper.classList.remove("open");
            setReaderMode("mm");
            loadMMBook(mmId, 1);
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

        if (!triggerPopover && (data.clean_word || word)) {
            HistoryManager.recordSearch(data.clean_word || word, "dict", data.results ? data.results.length : 0);
        }

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

        HistoryManager.recordSearch(q, state.searchMode, data.total);

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

// ----------------- Comprehensive History System (LocalStorage) -----------------

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getCurrentChapterName(mode, pageNum) {
    const tocs = (mode === "mm") ? state.mmTocs : state.paliTocs;
    if (tocs && tocs.length > 0) {
        let found = null;
        for (const t of tocs) {
            if (t.page_number <= pageNum) {
                found = t.name;
            } else {
                break;
            }
        }
        if (found) return found;
    }
    if (el.chapterTitleDisplay && el.chapterTitleDisplay.textContent) {
        const txt = el.chapterTitleDisplay.textContent.trim();
        if (txt && !txt.includes("ယှဉ်တွဲဖတ်ရှုခြင်း") && !txt.includes("ဖွင့်လှစ်နေပါသည်")) {
            return txt;
        }
    }
    return "";
}

function formatHistoryTime(timestamp) {
    if (!timestamp) return "";
    const diffMs = Date.now() - timestamp;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);

    if (diffMin < 1) return "လောလောလတ်လတ်";
    if (diffMin < 60) return `${toMyanmarNum(diffMin)} မိနစ်ခန့်က`;
    if (diffHour < 24) {
        const d = new Date(timestamp);
        const hours = d.getHours();
        const mins = String(d.getMinutes()).padStart(2, "0");
        const ampm = hours >= 12 ? "PM" : "AM";
        const h12 = hours % 12 || 12;
        return `${toMyanmarNum(h12)}:${toMyanmarNum(mins)} ${ampm}`;
    }
    const d = new Date(timestamp);
    const day = toMyanmarNum(d.getDate());
    const month = toMyanmarNum(d.getMonth() + 1);
    const year = toMyanmarNum(d.getFullYear());
    return `${day}/${month}/${year}`;
}

function groupHistoryByDate(items) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const pastWeekStart = todayStart - (7 * 86400000);
    const pastMonthStart = todayStart - (30 * 86400000);

    const groups = [
        { label: "📅 ယနေ့ (Today)", items: [] },
        { label: "📅 မနေ့က (Yesterday)", items: [] },
        { label: "📅 လွန်ခဲ့သော ၇ ရက်အတွင်း", items: [] },
        { label: "📅 လွန်ခဲ့သော ရက် ၃၀ အတွင်း", items: [] },
        { label: "📅 ယခင်လများက (Earlier)", items: [] }
    ];

    items.forEach(item => {
        const t = item.timestamp || 0;
        if (t >= todayStart) {
            groups[0].items.push(item);
        } else if (t >= yesterdayStart) {
            groups[1].items.push(item);
        } else if (t >= pastWeekStart) {
            groups[2].items.push(item);
        } else if (t >= pastMonthStart) {
            groups[3].items.push(item);
        } else {
            groups[4].items.push(item);
        }
    });

    return groups.filter(g => g.items.length > 0);
}

const HistoryManager = {
    READING_KEY: "tipitaka_reading_history_v1",
    SEARCH_KEY: "tipitaka_search_history_v1",
    MAX_READING: 200,
    MAX_SEARCH: 50,

    getReadingHistory() {
        try {
            const raw = localStorage.getItem(this.READING_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error("Failed to parse reading history:", e);
            return [];
        }
    },

    saveReadingHistory(list) {
        try {
            localStorage.setItem(this.READING_KEY, JSON.stringify(list.slice(0, this.MAX_READING)));
            this.updateBadgeCounts();
        } catch (e) {
            console.error("Failed to save reading history:", e);
        }
    },

    recordReading(entry) {
        if (!entry || !entry.bookId) return;
        const list = this.getReadingHistory();
        const now = Date.now();

        // If top item is identical book and mode, update page, chapter and timestamp
        if (list.length > 0) {
            const first = list[0];
            const isSameBook = (first.mode === entry.mode) && (first.bookId === entry.bookId);
            const isRecent = (now - (first.timestamp || 0)) < 3600000; // 1 hour session
            if (isSameBook && isRecent) {
                first.page = entry.page;
                if (entry.chapterName) first.chapterName = entry.chapterName;
                if (entry.bookName && (!first.bookName || first.bookName === entry.bookId)) first.bookName = entry.bookName;
                if (entry.mode === "split") {
                    if (entry.splitMMBookId) first.splitMMBookId = entry.splitMMBookId;
                    if (entry.splitMMBookName) first.splitMMBookName = entry.splitMMBookName;
                    if (entry.splitMMPage) first.splitMMPage = entry.splitMMPage;
                }
                first.timestamp = now;
                this.saveReadingHistory(list);
                return;
            }
        }

        const newItem = {
            id: "rh_" + now + "_" + Math.random().toString(36).substring(2, 6),
            mode: entry.mode || "pali",
            bookId: entry.bookId,
            bookName: entry.bookName || entry.bookId,
            page: entry.page || 1,
            chapterName: entry.chapterName || "",
            splitMMBookId: entry.splitMMBookId || null,
            splitMMBookName: entry.splitMMBookName || null,
            splitMMPage: entry.splitMMPage || null,
            timestamp: now
        };

        // Remove any identical prior entry for same book & page
        const filtered = list.filter(item => !(item.mode === newItem.mode && item.bookId === newItem.bookId && item.page === newItem.page));
        filtered.unshift(newItem);
        this.saveReadingHistory(filtered);
    },

    deleteReadingItem(id) {
        const list = this.getReadingHistory().filter(item => item.id !== id);
        this.saveReadingHistory(list);
    },

    clearReadingHistory() {
        localStorage.removeItem(this.READING_KEY);
        this.updateBadgeCounts();
    },

    getSearchHistory() {
        try {
            const raw = localStorage.getItem(this.SEARCH_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    },

    saveSearchHistory(list) {
        try {
            localStorage.setItem(this.SEARCH_KEY, JSON.stringify(list.slice(0, this.MAX_SEARCH)));
            this.updateBadgeCounts();
        } catch (e) {}
    },

    recordSearch(query, type, resultCount = null) {
        const q = (query || "").trim();
        if (!q || q.length < 2) return;
        let list = this.getSearchHistory();
        const now = Date.now();
        list = list.filter(item => item.query.toLowerCase() !== q.toLowerCase());
        list.unshift({
            id: "sh_" + now,
            query: q,
            type: type || "word",
            resultCount: (resultCount !== null && resultCount !== undefined) ? resultCount : null,
            timestamp: now
        });
        this.saveSearchHistory(list);
    },

    deleteSearchItem(id) {
        const list = this.getSearchHistory().filter(item => item.id !== id);
        this.saveSearchHistory(list);
    },

    clearSearchHistory() {
        localStorage.removeItem(this.SEARCH_KEY);
        this.updateBadgeCounts();
    },

    updateBadgeCounts() {
        if (el.historyReadingBadge) el.historyReadingBadge.textContent = this.getReadingHistory().length;
        if (el.historySearchBadge) el.historySearchBadge.textContent = this.getSearchHistory().length;
    }
};

function openHistoryModal() {
    if (!el.historyModal) return;
    el.historyModal.classList.add("open");
    renderHistoryModalContent();
    if (el.historyFilterInput) {
        setTimeout(() => el.historyFilterInput.focus(), 150);
    }
}

function closeHistoryModal() {
    if (!el.historyModal) return;
    el.historyModal.classList.remove("open");
}

function computeDhammaInsights() {
    const reading = HistoryManager.getReadingHistory();
    const search = HistoryManager.getSearchHistory();

    const totalReadCount = reading.length;
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();

    let thisWeekCount = 0;
    let todayCount = 0;
    const bookFrequency = {};
    const basketFrequency = {
        vinaya: 0,
        sutta: 0,
        abhidhamma: 0,
        commentary: 0
    };

    reading.forEach(item => {
        const ts = item.timestamp || 0;
        if (ts >= oneWeekAgo) {
            thisWeekCount++;
        }
        if (ts >= todayMs) {
            todayCount++;
        }

        const bName = item.bookName || item.bookId || "အမည်မသိကျမ်း";
        bookFrequency[bName] = (bookFrequency[bName] || 0) + 1;

        // Pitaka Basket categorization
        const bId = (item.bookId || "").toLowerCase();
        if (bId.includes("vinaya") || bId.startsWith("vi_") || bId.startsWith("vin")) {
            basketFrequency.vinaya++;
        } else if (bId.includes("abhidhamma") || bId.startsWith("ab_") || bId.startsWith("abh")) {
            basketFrequency.abhidhamma++;
        } else if (bId.includes("att") || bId.includes("tika") || bId.includes("atk") || bId.includes("_a") || bId.includes("_t")) {
            basketFrequency.commentary++;
        } else {
            basketFrequency.sutta++;
        }
    });

    // Determine Top Basket
    let topBasketName = "သုတ္တန်ပိဋကတ်";
    let maxBasketCount = basketFrequency.sutta;
    if (basketFrequency.vinaya > maxBasketCount) {
        topBasketName = "ဝိနည်းပိဋကတ်";
        maxBasketCount = basketFrequency.vinaya;
    }
    if (basketFrequency.abhidhamma > maxBasketCount) {
        topBasketName = "အဘိဓမ္မာပိဋကတ်";
        maxBasketCount = basketFrequency.abhidhamma;
    }
    if (basketFrequency.commentary > maxBasketCount) {
        topBasketName = "အဋ္ဌကထာ/ဋီကာ";
        maxBasketCount = basketFrequency.commentary;
    }

    if (totalReadCount === 0) {
        topBasketName = "မရှိသေးပါ";
        maxBasketCount = 0;
    }

    // Top 5 Books
    const sortedBooks = Object.keys(bookFrequency).map(name => ({
        name,
        count: bookFrequency[name]
    })).sort((a, b) => b.count - a.count).slice(0, 5);

    // Latest active entry
    let lastActiveText = "မရှိသေးပါ";
    if (reading.length > 0 && reading[0].timestamp) {
        lastActiveText = formatHistoryTime(reading[0].timestamp);
    }

    return {
        totalReadCount,
        thisWeekCount,
        todayCount,
        topBasketName,
        maxBasketCount,
        sortedBooks,
        lastActiveText,
        totalSearches: search.length
    };
}

async function exportProfileBackup() {
    try {
        let currentBookmarks = state.bookmarks || [];
        try {
            const bRes = await fetch("/api/bookmarks");
            if (bRes.ok) {
                currentBookmarks = await bRes.json();
            }
        } catch (e) {
            console.warn("Could not fetch latest bookmarks from API:", e);
        }

        const backupData = {
            version: "1.0",
            appName: "Tipitaka Pali & Myanmar Web App",
            exportDate: new Date().toISOString(),
            readingHistory: HistoryManager.getReadingHistory(),
            searchHistory: HistoryManager.getSearchHistory(),
            bookmarks: currentBookmarks,
            settings: {
                theme: state.theme || localStorage.getItem("tipitaka_theme") || "paper",
                fontSize: state.fontSize || localStorage.getItem("tipitaka_font_size") || "100",
                showNotes: state.showNotes !== undefined ? state.showNotes : (localStorage.getItem("tipitaka_show_notes") || "0"),
                scrollMode: state.scrollMode || localStorage.getItem("tipitaka_scroll_mode") || "feed",
                readerMode: state.readerMode || "pali"
            }
        };

        const jsonStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const d = new Date();
        const dateStr = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
        const filename = `tipitaka-backup-${dateStr}.json`;

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Backup export failed:", err);
        alert("Backup ဖိုင် ထုတ်ယူရာတွင် အမှားတစ်ခု ဖြစ်ပေါ်ခဲ့ပါသည်: " + err.message);
    }
}

async function importProfileBackup(file) {
    if (!file) return;
    try {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                const data = JSON.parse(text);

                if (!data || typeof data !== "object") {
                    throw new Error("မှန်ကန်သော JSON ဖိုင် မဟုတ်ပါ။");
                }

                // 1. Reading History merge
                if (Array.isArray(data.readingHistory)) {
                    const existing = HistoryManager.getReadingHistory();
                    const merged = [...data.readingHistory];
                    existing.forEach(ex => {
                        const exists = merged.some(m => m.mode === ex.mode && m.bookId === ex.bookId && m.page === ex.page);
                        if (!exists) merged.push(ex);
                    });
                    merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                    HistoryManager.saveReadingHistory(merged);
                }

                // 2. Search History merge
                if (Array.isArray(data.searchHistory)) {
                    const existingS = HistoryManager.getSearchHistory();
                    const mergedS = [...data.searchHistory];
                    existingS.forEach(ex => {
                        const exists = mergedS.some(m => (m.query || "").toLowerCase() === (ex.query || "").toLowerCase());
                        if (!exists) mergedS.push(ex);
                    });
                    mergedS.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                    HistoryManager.saveSearchHistory(mergedS);
                }

                // 3. Bookmarks restore
                if (Array.isArray(data.bookmarks) && data.bookmarks.length > 0) {
                    for (const bm of data.bookmarks) {
                        if (bm.book_id && bm.page_number) {
                            try {
                                await fetch("/api/bookmarks", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        book_id: bm.book_id,
                                        page_number: bm.page_number,
                                        note: bm.note || ""
                                    })
                                });
                            } catch (bmErr) {
                                console.warn("Failed to restore single bookmark:", bmErr);
                            }
                        }
                    }
                    await loadBookmarks();
                }

                // 4. Settings restore
                if (data.settings && typeof data.settings === "object") {
                    if (data.settings.theme) setupTheme(data.settings.theme);
                    if (data.settings.fontSize) setupFontSize(data.settings.fontSize);
                    if (data.settings.showNotes !== undefined) setNotesVisibility(data.settings.showNotes);
                    if (data.settings.scrollMode) setScrollMode(data.settings.scrollMode);
                }

                HistoryManager.updateBadgeCounts();
                renderHistoryModalContent();
                alert(`✅ Backup ဖိုင်အား အောင်မြင်စွာ ပြန်လည်တင်သွင်းပြီးပါပြီ!\n\n- ဖတ်ရှုမှု မှတ်တမ်း: ${toMyanmarNum(HistoryManager.getReadingHistory().length)} ခု\n- ရှာဖွေမှု မှတ်တမ်း: ${toMyanmarNum(HistoryManager.getSearchHistory().length)} ခု\n- စာညှပ်မှတ်စုများ: ${toMyanmarNum(state.bookmarks ? state.bookmarks.length : 0)} ခု`);

            } catch (parseErr) {
                console.error("Failed to parse backup JSON:", parseErr);
                alert("Backup ဖိုင်ကို ဖတ်ရှု၍ မရပါ- " + parseErr.message);
            }
        };
        reader.readAsText(file);
    } catch (err) {
        console.error("Failed to read file:", err);
        alert("ဖိုင် ဖတ်ရှုရာတွင် ချို့ယွင်းချက် ဖြစ်ပေါ်ခဲ့ပါသည်: " + err.message);
    }
}

function renderInsightsContent() {
    const insights = computeDhammaInsights();

    let topBooksHtml = "";
    if (insights.sortedBooks.length === 0) {
        topBooksHtml = `<div class="history-empty-state" style="padding: 20px 0;"><p>ဖတ်ရှုထားသော ကျမ်းစာ မရှိသေးပါ။</p></div>`;
    } else {
        const maxCount = insights.sortedBooks[0].count || 1;
        insights.sortedBooks.forEach((b, idx) => {
            const pct = Math.max(12, Math.round((b.count / maxCount) * 100));
            topBooksHtml += `
                <div class="top-book-row">
                    <div class="top-book-header">
                        <div class="top-book-name">
                            <span>${toMyanmarNum(idx + 1)}။</span>
                            <span>${escapeHtml(b.name)}</span>
                        </div>
                        <div class="top-book-count">${toMyanmarNum(b.count)} ကြိမ်</div>
                    </div>
                    <div class="top-book-bar-track">
                        <div class="top-book-bar-fill" style="width: ${pct}%;"></div>
                    </div>
                </div>
            `;
        });
    }

    el.historyItemsContainer.innerHTML = `
        <div class="insights-container">
            <div class="insights-banner">
                <div class="insights-banner-icon">☸️</div>
                <div class="insights-banner-text">
                    <h3>ဓမ္မစာပေ ဖတ်ရှုလေ့လာမှု စာရင်းအင်း (Reading Insights)</h3>
                    <p>ဤကိန်းဂဏန်းများသည် သင်၏ Browser အတွင်း ကျမ်းစာများ ဖတ်ရှုလေ့လာခဲ့မှုများအပေါ် အခြေခံ၍ သာသနာတော်ဆိုင်ရာ ဓမ္မလေ့လာမှု တိုးတက်မှုကို အလိုအလျောက် တွက်ချက်ဖော်ပြထားခြင်း ဖြစ်ပါသည်။</p>
                </div>
            </div>

            <div class="insights-grid">
                <div class="insight-stat-card card-accent">
                    <div class="stat-icon">📖</div>
                    <div class="stat-content">
                        <div class="stat-value">${toMyanmarNum(insights.thisWeekCount)} ကြိမ်</div>
                        <div class="stat-label">ယခုအပတ် ဖတ်ရှုမှု</div>
                        <div class="stat-sub">ယနေ့ဖတ်ရှုမှု: ${toMyanmarNum(insights.todayCount)} ကြိမ်</div>
                    </div>
                </div>

                <div class="insight-stat-card card-gold">
                    <div class="stat-icon">☸️</div>
                    <div class="stat-content">
                        <div class="stat-value" title="${escapeHtml(insights.topBasketName)}">${escapeHtml(insights.topBasketName)}</div>
                        <div class="stat-label">အများဆုံး လေ့လာသော ပိဋကတ်</div>
                        <div class="stat-sub">${toMyanmarNum(insights.maxBasketCount)} ကြိမ် လေ့လာခဲ့</div>
                    </div>
                </div>

                <div class="insight-stat-card card-green">
                    <div class="stat-icon">📚</div>
                    <div class="stat-content">
                        <div class="stat-value">${toMyanmarNum(insights.totalReadCount)} မျက်နှာ</div>
                        <div class="stat-label">စုစုပေါင်း ဖွင့်ဖတ်ခဲ့မှု</div>
                        <div class="stat-sub">စကားလုံးရှာဖွေမှု: ${toMyanmarNum(insights.totalSearches)} ကြိမ်</div>
                    </div>
                </div>

                <div class="insight-stat-card card-blue">
                    <div class="stat-icon">⏱️</div>
                    <div class="stat-content">
                        <div class="stat-value">${insights.lastActiveText}</div>
                        <div class="stat-label">နောက်ဆုံး လေ့လာခဲ့ချိန်</div>
                        <div class="stat-sub">လတ်တလော ဓမ္မလေ့လာမှု</div>
                    </div>
                </div>
            </div>

            <div class="insights-section">
                <div class="insights-section-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="8" r="7"></circle>
                        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                    </svg>
                    <span>အများဆုံး ဖတ်ရှုလေ့လာဖြစ်သော ကျမ်းစာအုပ်များ (Top 5 Books)</span>
                </div>
                <div class="insights-top-books">
                    ${topBooksHtml}
                </div>
            </div>

            <div class="insights-backup-card">
                <div class="backup-card-info">
                    <h4>💾 အချက်အလက်များ သိမ်းဆည်းရန်နှင့် ပြန်လည်တင်သွင်းရန် (Backup & Restore)</h4>
                    <p>ဖတ်ရှုမှတ်တမ်း၊ ရှာဖွေမှုမှတ်တမ်း၊ မှတ်စု (Bookmarks) များနှင့် စာလုံးအရွယ်အစား/Theme ဆက်တင်များအားလုံးကို JSON ဖိုင်ဖြင့် လွယ်ကူစွာ သိမ်းဆည်း သို့မဟုတ် ဖုန်း/ကွန်ပျူတာ အချင်းချင်း လွှဲပြောင်းနိုင်ပါသည်။</p>
                </div>
                <div class="backup-card-actions">
                    <button class="history-action-btn" id="btnInsightsExport" style="padding: 8px 14px; font-weight:600;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        <span>Backup ထုတ်ယူမည်</span>
                    </button>
                    <button class="history-action-btn" id="btnInsightsImport" style="padding: 8px 14px; font-weight:600;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <span>Restore တင်သွင်းမည်</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    const btnExp = document.getElementById("btnInsightsExport");
    if (btnExp) {
        btnExp.addEventListener("click", exportProfileBackup);
    }
    const btnImp = document.getElementById("btnInsightsImport");
    if (btnImp && el.restoreFileInput) {
        btnImp.addEventListener("click", () => el.restoreFileInput.click());
    }
}

function renderHistoryModalContent() {
    if (!el.historyItemsContainer) return;
    HistoryManager.updateBadgeCounts();

    const activeTab = state.historyActiveTab || "reading";
    const isReadingTab = activeTab === "reading";
    const isSearchTab = activeTab === "search";
    const isInsightsTab = activeTab === "insights";

    if (el.tabHistoryReading) el.tabHistoryReading.classList.toggle("active", isReadingTab);
    if (el.tabHistorySearch) el.tabHistorySearch.classList.toggle("active", isSearchTab);
    if (el.tabHistoryInsights) el.tabHistoryInsights.classList.toggle("active", isInsightsTab);

    if (el.historySearchWrapper) {
        el.historySearchWrapper.style.display = isInsightsTab ? "none" : "flex";
    }
    if (el.historyFilterPills) {
        el.historyFilterPills.style.display = isReadingTab ? "flex" : "none";
    }

    if (isInsightsTab) {
        renderInsightsContent();
        return;
    }

    const filterText = (el.historyFilterInput ? el.historyFilterInput.value : "").trim().toLowerCase();

    if (isReadingTab) {
        let items = HistoryManager.getReadingHistory();

        // Mode filter
        if (state.historyModeFilter && state.historyModeFilter !== "all") {
            items = items.filter(it => it.mode === state.historyModeFilter);
        }

        // Search text filter
        if (filterText) {
            items = items.filter(it => {
                const bName = (it.bookName || "").toLowerCase();
                const cName = (it.chapterName || "").toLowerCase();
                const pNum = toMyanmarNum(it.page) + " " + it.page;
                const sName = (it.splitMMBookName || "").toLowerCase();
                return bName.includes(filterText) || cName.includes(filterText) || pNum.includes(filterText) || sName.includes(filterText);
            });
        }

        if (items.length === 0) {
            el.historyItemsContainer.innerHTML = `
                <div class="history-empty-state">
                    <div class="history-empty-icon">📖</div>
                    <p>ဖတ်ရှုခဲ့သည့် မှတ်တမ်း မရှိသေးပါ။</p>
                    <p class="empty-sub">ကျမ်းစာအုပ်များကို ဖွင့်လှစ်ဖတ်ရှုပါက ဤနေရာတွင် အလိုအလျောက် ရက်စွဲအလိုက် စနစ်တကျ မှတ်တမ်းတင်ပေးမည် ဖြစ်ပါသည်။</p>
                </div>
            `;
            return;
        }

        const dateGroups = groupHistoryByDate(items);
        let html = "";

        dateGroups.forEach(group => {
            html += `
                <div class="history-date-header">
                    <span>${group.label}</span>
                    <span class="history-date-count">${toMyanmarNum(group.items.length)} ခု</span>
                </div>
            `;

            group.items.forEach(it => {
                let badgeClass = "badge-pali";
                let badgeText = "☸️ ပါဠိတော်";
                if (it.mode === "mm") {
                    badgeClass = "badge-mm";
                    badgeText = "🇲🇲 မြန်မာပြန်";
                } else if (it.mode === "split") {
                    badgeClass = "badge-split";
                    badgeText = "📖 ယှဉ်တွဲဖတ်";
                }

                let title = it.bookName;
                if (it.mode === "split" && it.splitMMBookName) {
                    title = `${it.bookName} ↔ ${it.splitMMBookName}`;
                }

                let meta = `<span>စာမျက်နှာ ${toMyanmarNum(it.page)}</span>`;
                if (it.mode === "split" && it.splitMMPage) {
                    meta = `<span>ပါဠိ စာမျက်နှာ ${toMyanmarNum(it.page)} • မြန်မာပြန် စာမျက်နှာ ${toMyanmarNum(it.splitMMPage)}</span>`;
                }
                if (it.chapterName) {
                    meta += `<span class="meta-dot">•</span><span title="${escapeHtml(it.chapterName)}">${escapeHtml(it.chapterName)}</span>`;
                }

                const timeStr = formatHistoryTime(it.timestamp);

                html += `
                    <div class="history-item-card" data-history-id="${it.id}" data-mode="${it.mode}" data-book-id="${it.bookId}" data-page="${it.page}" data-split-book="${it.splitMMBookId || ''}" data-split-page="${it.splitMMPage || ''}">
                        <div class="history-card-left">
                            <span class="history-mode-badge ${badgeClass}">${badgeText}</span>
                            <div class="history-card-info">
                                <div class="history-item-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
                                <div class="history-item-meta">${meta}</div>
                            </div>
                        </div>
                        <div class="history-card-right">
                            <span class="history-time-tag">${timeStr}</span>
                            <button class="btn-delete-history" title="ဤမှတ်တမ်းကို ဖျက်ရန်" data-delete-id="${it.id}">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                `;
            });
        });

        el.historyItemsContainer.innerHTML = html;

        // Click to open book & resume reading
        el.historyItemsContainer.querySelectorAll(".history-item-card").forEach(card => {
            card.addEventListener("click", async (e) => {
                if (e.target.closest(".btn-delete-history")) return;
                const mode = card.getAttribute("data-mode");
                const bId = card.getAttribute("data-book-id");
                const page = parseInt(card.getAttribute("data-page"), 10) || 1;
                const splitBook = card.getAttribute("data-split-book");
                const splitPage = parseInt(card.getAttribute("data-split-page"), 10) || 1;

                closeHistoryModal();

                if (mode === "mm") {
                    setReaderMode("mm");
                    await loadMMBook(bId, page);
                } else if (mode === "split") {
                    setReaderMode("split");
                    await loadPaliBook(bId, page);
                    if (splitBook) {
                        await loadMMPage(splitBook, splitPage);
                    }
                } else {
                    setReaderMode("pali");
                    await loadPaliBook(bId, page);
                }
                setAppView("reader");
            });
        });

        // Delete single reading item
        el.historyItemsContainer.querySelectorAll(".btn-delete-history").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const id = btn.getAttribute("data-delete-id");
                HistoryManager.deleteReadingItem(id);
                renderHistoryModalContent();
            });
        });

    } else {
        // Search History Tab
        let items = HistoryManager.getSearchHistory();

        if (filterText) {
            items = items.filter(it => it.query.toLowerCase().includes(filterText));
        }

        if (items.length === 0) {
            el.historyItemsContainer.innerHTML = `
                <div class="history-empty-state">
                    <div class="history-empty-icon">🔍</div>
                    <p>ရှာဖွေခဲ့သည့် မှတ်တမ်း မရှိသေးပါ။</p>
                    <p class="empty-sub">ပါဠိစကားလုံး၊ သုတ္တန်၊ ကျမ်းစာအုပ်များကို ရှာဖွေပါက ဤနေရာတွင် စနစ်တကျ မှတ်တမ်းတင်ပေးမည် ဖြစ်ပါသည်။</p>
                </div>
            `;
            return;
        }

        const dateGroups = groupHistoryByDate(items);
        let html = "";

        dateGroups.forEach(group => {
            html += `
                <div class="history-date-header">
                    <span>${group.label}</span>
                    <span class="history-date-count">${toMyanmarNum(group.items.length)} ခု</span>
                </div>
            `;

            group.items.forEach(it => {
                let typeLabel = "ပါဠိစကားလုံး ရှာဖွေမှု";
                if (it.type === "sutta") typeLabel = "သုတ္တန် ရှာဖွေမှု";
                else if (it.type === "book") typeLabel = "ပါဠိကျမ်းစာအုပ် ရှာဖွေမှု";
                else if (it.type === "mm_book") typeLabel = "မြန်မာပြန်ကျမ်းစာ ရှာဖွေမှု";
                else if (it.type === "mm_toc") typeLabel = "မာတိကာ ရှာဖွေမှု";
                else if (it.type === "dict") typeLabel = "အဘိဓာန် ရှာဖွေမှု";

                let meta = `<span>${typeLabel}</span>`;
                if (it.resultCount !== null && it.resultCount !== undefined) {
                    meta += `<span class="meta-dot">•</span><span>တွေ့ရှိမှု ${toMyanmarNum(it.resultCount)} ခု</span>`;
                }

                const timeStr = formatHistoryTime(it.timestamp);

                html += `
                    <div class="history-item-card" data-search-query="${escapeHtml(it.query)}" data-search-type="${it.type || 'word'}">
                        <div class="history-card-left">
                            <span class="history-mode-badge badge-search">🔍 ရှာဖွေမှု</span>
                            <div class="history-card-info">
                                <div class="history-item-title">"${escapeHtml(it.query)}"</div>
                                <div class="history-item-meta">${meta}</div>
                            </div>
                        </div>
                        <div class="history-card-right">
                            <span class="history-time-tag">${timeStr}</span>
                            <button class="btn-delete-history" title="ဤမှတ်တမ်းကို ဖျက်ရန်" data-delete-search-id="${it.id}">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                `;
            });
        });

        el.historyItemsContainer.innerHTML = html;

        // Click on search item to rerun search
        el.historyItemsContainer.querySelectorAll(".history-item-card").forEach(card => {
            card.addEventListener("click", (e) => {
                if (e.target.closest(".btn-delete-history")) return;
                const query = card.getAttribute("data-search-query");
                const type = card.getAttribute("data-search-type");
                closeHistoryModal();

                if (type === "dict") {
                    toggleDictSidebar(true);
                    lookupDictionary(query);
                } else {
                    openSearchModal();
                    if (el.globalSearchInput) el.globalSearchInput.value = query;
                    state.searchMode = type || "word";
                    el.modalTabBtns.forEach(btn => {
                        btn.classList.toggle("active", btn.getAttribute("data-mode") === state.searchMode);
                    });
                    performSearch();
                }
            });
        });

        // Delete single search item
        el.historyItemsContainer.querySelectorAll(".btn-delete-history").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const id = btn.getAttribute("data-delete-search-id");
                HistoryManager.deleteSearchItem(id);
                renderHistoryModalContent();
            });
        });
    }
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
                    loadMMPage(state.mmBookId, state.mmPage - 1).then(() => {
                        if (scrollToBottom && el.readerContainer) el.readerContainer.scrollTop = el.readerContainer.scrollHeight;
                    });
                }
            } else {
                if (state.paliPage > state.paliFirstPage) {
                    showScrollToast(`စာမျက်နှာ ${toMyanmarNum(state.paliPage - 1)} သို့ ပြောင်းနေပါသည်...`);
                    loadPaliPage(state.paliBookId, state.paliPage - 1).then(() => {
                        if (scrollToBottom && el.readerContainer) el.readerContainer.scrollTop = el.readerContainer.scrollHeight;
                    });
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
                    loadNextFeedPage().then(() => {
                        const elTarget = document.getElementById(state.readerMode === "mm" ? `mm-page-${target}` : `pali-page-${target}`);
                        if (elTarget) elTarget.scrollIntoView({ behavior: "smooth", block: "start" });
                    });
                }
            }
        } else {
            if (state.readerMode === "mm") {
                if (state.mmPage < state.mmLastPage) {
                    showScrollToast(`စာမျက်နှာ ${toMyanmarNum(state.mmPage + 1)} သို့ ပြောင်းနေပါသည်...`);
                    loadMMPage(state.mmBookId, state.mmPage + 1).then(() => {
                        if (scrollToBottom && el.readerContainer) el.readerContainer.scrollTop = el.readerContainer.scrollHeight;
                    });
                }
            } else {
                if (state.paliPage < state.paliLastPage) {
                    showScrollToast(`စာမျက်နှာ ${toMyanmarNum(state.paliPage + 1)} သို့ ပြောင်းနေပါသည်...`);
                    loadPaliPage(state.paliBookId, state.paliPage + 1).then(() => {
                        if (scrollToBottom && el.readerContainer) el.readerContainer.scrollTop = el.readerContainer.scrollHeight;
                    });
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

    // Split View Independent Navigation & Sync Controls
    if (el.btnSplitPaliPrev) {
        el.btnSplitPaliPrev.addEventListener("click", () => {
            if (state.paliPage > (state.paliFirstPage || 1)) {
                loadPaliPage(state.paliBookId, state.paliPage - 1);
            }
        });
    }
    if (el.btnSplitPaliNext) {
        el.btnSplitPaliNext.addEventListener("click", () => {
            if (state.paliPage < (state.paliLastPage || 99999)) {
                loadPaliPage(state.paliBookId, state.paliPage + 1);
            }
        });
    }
    if (el.splitPaliPageInput) {
        const handleSplitPaliInput = () => {
            const p = parseInt(el.splitPaliPageInput.value, 10);
            if (!isNaN(p) && p !== state.paliPage) {
                loadPaliPage(state.paliBookId, p);
            }
        };
        el.splitPaliPageInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") handleSplitPaliInput();
        });
        el.splitPaliPageInput.addEventListener("change", handleSplitPaliInput);
    }

    const btnRightPrev = el.btnSplitRightPrev || el.btnSplitMMPrev;
    if (btnRightPrev) {
        btnRightPrev.addEventListener("click", () => {
            if (state.splitRightType === "mm") {
                if (state.mmPage > (state.mmFirstPage || 1)) {
                    loadMMPage(state.mmBookId, state.mmPage - 1, true);
                }
            } else {
                if (state.splitRightPage > 1) {
                    loadSplitRightPage(state.splitRightBookId, state.splitRightPage - 1, state.splitRightType);
                }
            }
        });
    }

    const btnRightNext = el.btnSplitRightNext || el.btnSplitMMNext;
    if (btnRightNext) {
        btnRightNext.addEventListener("click", () => {
            if (state.splitRightType === "mm") {
                if (state.mmPage < (state.mmLastPage || 99999)) {
                    loadMMPage(state.mmBookId, state.mmPage + 1, true);
                }
            } else {
                if (state.splitRightPage < (state.splitRightLastPage || 99999)) {
                    loadSplitRightPage(state.splitRightBookId, state.splitRightPage + 1, state.splitRightType);
                }
            }
        });
    }

    const inputRight = el.splitRightPageInput || el.splitMMPageInput;
    if (inputRight) {
        const handleSplitRightInput = () => {
            const p = parseInt(inputRight.value, 10);
            if (!isNaN(p)) {
                if (state.splitRightType === "mm") {
                    if (p !== state.mmPage) loadMMPage(state.mmBookId, p, true);
                } else {
                    if (p !== state.splitRightPage) loadSplitRightPage(state.splitRightBookId, p, state.splitRightType);
                }
            }
        };
        inputRight.addEventListener("keydown", (e) => {
            if (e.key === "Enter") handleSplitRightInput();
        });
        inputRight.addEventListener("change", handleSplitRightInput);
    }

    if (el.btnSplitSync) {
        el.btnSplitSync.addEventListener("click", handleSplitSync);
    }

    if (el.btnOpenCompanionMobile) {
        el.btnOpenCompanionMobile.addEventListener("click", () => {
            toggleSidebar(false);
            if (el.relatedDropdownWrapper) {
                el.relatedDropdownWrapper.classList.toggle("open");
            }
        });
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

    el.readerContainer.addEventListener("touchend", (e) => {
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;
        const absX = Math.abs(diffX);
        const absY = Math.abs(diffY);

        // Tap to Toggle Bars in Focus Mode
        if (state.isFocusMode && absX < 15 && absY < 15) {
            const activeElem = document.elementFromPoint(touchEndX, touchEndY);
            if (activeElem && !activeElem.closest("button, a, input, select, .paranum, .note-btn, .edition-btn, #btnExitFocusMode, .word, .bookmark-toggle-btn")) {
                const selection = window.getSelection ? window.getSelection().toString() : "";
                if (!selection || selection.trim().length === 0) {
                    toggleFocusBars();
                    return;
                }
            }
        }

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
        // Auto-hide revealed bars in focus mode when scrolling
        if (state.isFocusMode && document.body.classList.contains("focus-bars-revealed")) {
            document.body.classList.remove("focus-bars-revealed");
        }

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

            if (tabId === "tab-toc") {
                const curPg = (state.readerMode === "mm") ? state.mmPage : state.paliPage;
                highlightActiveToc(curPg, true);
            } else if (tabId === "tab-suttas") {
                const curPg = (state.readerMode === "mm") ? state.mmPage : state.paliPage;
                highlightActiveSutta(curPg);
                const activeSuttaBtn = el.suttaList ? el.suttaList.querySelector(".sutta-item-btn.active") : null;
                if (activeSuttaBtn) activeSuttaBtn.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }
        });
    });

    // Click header current book/chapter badge to open TOC
    if (el.currentBookBadge) {
        el.currentBookBadge.addEventListener("click", () => {
            toggleSidebar(true);
            const tocTabBtn = document.querySelector('.sidebar-tabs .tab-btn[data-tab="tab-toc"]');
            if (tocTabBtn) tocTabBtn.click();
            const curPg = (state.readerMode === "mm") ? state.mmPage : state.paliPage;
            highlightActiveToc(curPg, true);
        });
    }

    // Click Mobile & Tablet Chapter Breadcrumb to open TOC directly
    if (el.mobileChapterBreadcrumb) {
        el.mobileChapterBreadcrumb.addEventListener("click", () => {
            toggleSidebar(true);
            const tocTabBtn = document.querySelector('.sidebar-tabs .tab-btn[data-tab="tab-toc"]');
            if (tocTabBtn) tocTabBtn.click();
            const curPg = (state.readerMode === "mm") ? state.mmPage : state.paliPage;
            highlightActiveToc(curPg, true);
        });
    }

    // Click Sticky Current Reading Card in TOC to smoothly focus on active item
    if (el.tocCurrentCard) {
        el.tocCurrentCard.addEventListener("click", () => {
            if (!el.tocList) return;
            const activeBtn = el.tocList.querySelector(".toc-item-btn.active");
            if (activeBtn) {
                activeBtn.scrollIntoView({ block: "center", behavior: "smooth" });
                activeBtn.classList.add("toc-flash-highlight");
                setTimeout(() => activeBtn.classList.remove("toc-flash-highlight"), 1200);
            }
        });
    }

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
        } else {
            const wordEl = e.target.closest(".pali-word, .no-split");
            if (wordEl) {
                clickedWord = wordEl.textContent.trim();
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
    if (el.splitRightContent) el.splitRightContent.addEventListener("click", handleWordClick);
    if (el.splitMMContent && el.splitMMContent !== el.splitRightContent) el.splitMMContent.addEventListener("click", handleWordClick);

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
                closeHistoryModal();
                el.helpModal.classList.remove("open");
                el.dictQuickPopover.style.display = "none";
            }
            return;
        }

        if (e.key === "F11") {
            e.preventDefault();
            toggleFocusMode();
        } else if (e.key === "[" || e.key === "ArrowLeft") {
            prevPage();
        } else if (e.key === "]" || e.key === "ArrowRight") {
            nextPage();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
            openSearchModal();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "h") {
            e.preventDefault();
            openHistoryModal();
        } else if (e.key === "/" && !el.searchModal.classList.contains("open")) {
            e.preventDefault();
            openSearchModal();
        } else if (e.key === "?" && !el.helpModal.classList.contains("open")) {
            e.preventDefault();
            el.helpModal.classList.add("open");
        } else if (e.key === "Escape") {
            if (state.isFocusMode) {
                toggleFocusMode(false);
            }
            closeSearchModal();
            closeHistoryModal();
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
            } else {
                if (state.readerMode === "mm") {
                    if (!el.paliContent || !el.paliContent.innerHTML.trim() || el.paliContent.innerHTML.includes("ဖွင့်လှစ်နေပါသည်")) {
                        await loadMMBook(state.mmBookId || "01_vinaya_01", state.mmPage || 1);
                    }
                } else if (state.readerMode === "split") {
                    await renderSplitView();
                } else {
                    if (!el.paliContent || !el.paliContent.innerHTML.trim() || el.paliContent.innerHTML.includes("ဖွင့်လှစ်နေပါသည်")) {
                        await loadPaliBook(state.paliBookId || "mula_vi_01", state.paliPage || 1);
                    }
                }
            }
            setAppView("reader");
        });
    }
    if (el.btnNavRecent) {
        el.btnNavRecent.addEventListener("click", () => {
            closeSidebarMobile();
            openHistoryModal();
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

    // Comprehensive History Modal Listeners
    if (el.btnOpenHistory) {
        el.btnOpenHistory.addEventListener("click", openHistoryModal);
    }
    if (el.btnOpenHistoryMobile) {
        el.btnOpenHistoryMobile.addEventListener("click", () => {
            closeSidebarMobile();
            openHistoryModal();
        });
    }
    if (el.btnCloseHistory) {
        el.btnCloseHistory.addEventListener("click", closeHistoryModal);
    }
    if (el.historyModal) {
        el.historyModal.addEventListener("click", (e) => {
            if (e.target === el.historyModal) closeHistoryModal();
        });
    }
    if (el.btnClearAllHistory) {
        el.btnClearAllHistory.addEventListener("click", () => {
            const tab = state.historyActiveTab;
            let msg = "ဖတ်ရှုခဲ့သည့် မှတ်တမ်းအားလုံးကို ဖျက်ပစ်ရန် သေချာပါသလား?";
            if (tab === "search") {
                msg = "ရှာဖွေခဲ့သည့် မှတ်တမ်းအားလုံးကို ဖျက်ပစ်ရန် သေချာပါသလား?";
            } else if (tab === "insights") {
                msg = "ဖတ်ရှုမှုနှင့် ရှာဖွေမှု မှတ်တမ်းအားလုံးကို ရှင်းလင်းဖျက်ပစ်ရန် သေချာပါသလား?";
            }
            if (confirm(msg)) {
                if (tab === "reading") {
                    HistoryManager.clearReadingHistory();
                } else if (tab === "search") {
                    HistoryManager.clearSearchHistory();
                } else {
                    HistoryManager.clearReadingHistory();
                    HistoryManager.clearSearchHistory();
                }
                renderHistoryModalContent();
            }
        });
    }
    if (el.btnBackupHistory) {
        el.btnBackupHistory.addEventListener("click", exportProfileBackup);
    }
    if (el.btnRestoreHistory) {
        el.btnRestoreHistory.addEventListener("click", () => {
            if (el.restoreFileInput) el.restoreFileInput.click();
        });
    }
    if (el.restoreFileInput) {
        el.restoreFileInput.addEventListener("change", (e) => {
            if (e.target.files && e.target.files[0]) {
                importProfileBackup(e.target.files[0]);
                e.target.value = "";
            }
        });
    }
    if (el.historyFilterInput) {
        let hDebounce = null;
        el.historyFilterInput.addEventListener("input", () => {
            if (el.btnClearHistoryFilter) {
                el.btnClearHistoryFilter.style.display = el.historyFilterInput.value ? "block" : "none";
            }
            clearTimeout(hDebounce);
            hDebounce = setTimeout(renderHistoryModalContent, 150);
        });
    }
    if (el.btnClearHistoryFilter) {
        el.btnClearHistoryFilter.addEventListener("click", () => {
            el.historyFilterInput.value = "";
            el.btnClearHistoryFilter.style.display = "none";
            renderHistoryModalContent();
        });
    }
    if (el.tabHistoryReading) {
        el.tabHistoryReading.addEventListener("click", () => {
            state.historyActiveTab = "reading";
            renderHistoryModalContent();
        });
    }
    if (el.tabHistorySearch) {
        el.tabHistorySearch.addEventListener("click", () => {
            state.historyActiveTab = "search";
            renderHistoryModalContent();
        });
    }
    if (el.tabHistoryInsights) {
        el.tabHistoryInsights.addEventListener("click", () => {
            state.historyActiveTab = "insights";
            renderHistoryModalContent();
        });
    }
    if (el.historyFilterPills) {
        el.historyFilterPills.querySelectorAll(".history-pill").forEach(pill => {
            pill.addEventListener("click", () => {
                el.historyFilterPills.querySelectorAll(".history-pill").forEach(p => p.classList.remove("active"));
                pill.classList.add("active");
                state.historyModeFilter = pill.getAttribute("data-mode-filter") || "all";
                renderHistoryModalContent();
            });
        });
    }

    // Focus / Fullscreen Mode Listeners
    if (el.btnToggleFullscreen) {
        el.btnToggleFullscreen.addEventListener("click", () => toggleFocusMode());
    }
    if (el.btnToggleFullscreenMobile) {
        el.btnToggleFullscreenMobile.addEventListener("click", () => {
            closeSidebarMobile();
            toggleFocusMode();
        });
    }
    if (el.btnExitFocusMode) {
        el.btnExitFocusMode.addEventListener("click", () => toggleFocusMode(false));
    }

    // Tap-to-toggle bars on reader click for Desktop
    if (el.readerContainer) {
        el.readerContainer.addEventListener("click", (e) => {
            if (!state.isFocusMode) return;
            const target = e.target;
            if (target && target.closest("button, a, input, select, .paranum, .note-btn, .edition-btn, #btnExitFocusMode, .word, .bookmark-toggle-btn")) {
                return;
            }
            const selection = window.getSelection ? window.getSelection().toString() : "";
            if (selection && selection.trim().length > 0) return;
            toggleFocusBars();
        });
    }

    // Sync state when native fullscreen changes (e.g. Esc key or browser gesture)
    document.addEventListener("fullscreenchange", () => {
        const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
        if (!isFull && state.isFocusMode) {
            toggleFocusMode(false);
        }
    });
    document.addEventListener("webkitfullscreenchange", () => {
        const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
        if (!isFull && state.isFocusMode) {
            toggleFocusMode(false);
        }
    });
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
        const curPage = (state.readerMode === "mm") ? state.mmPage : state.paliPage;
        if (state.readerMode === "mm") loadMMPage(state.mmBookId, curPage);
        else if (state.readerMode === "pali") loadPaliPage(state.paliBookId, curPage);
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

    const loaded = getLoadedFeedPages();
    if (loaded.length === 0) return;

    const currentLast = loaded[loaded.length - 1];
    const nextPage = currentLast + 1;

    if (state.readerMode === "pali") {
        if (nextPage > state.paliLastPage) {
            showSentinelEnd();
            return;
        }
        if (document.getElementById(`pali-page-${nextPage}`)) return;
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
        if (nextPage > state.mmLastPage) {
            showSentinelEnd();
            return;
        }
        if (document.getElementById(`mm-page-${nextPage}`)) return;
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
    if (state.scrollMode !== "feed") return;

    const loaded = getLoadedFeedPages();
    if (loaded.length === 0) return;

    const currentFirst = loaded[0];
    const prevPageNum = currentFirst - 1;

    state.isLoadingMore = true;
    if (el.btnLoadPrevPage) el.btnLoadPrevPage.disabled = true;

    try {
        if (state.readerMode === "pali") {
            if (prevPageNum >= state.paliFirstPage && !document.getElementById(`pali-page-${prevPageNum}`)) {
                await loadPaliPage(state.paliBookId, prevPageNum, null, false, true);
            }
        } else if (state.readerMode === "mm") {
            if (prevPageNum >= state.mmFirstPage && !document.getElementById(`mm-page-${prevPageNum}`)) {
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
        debounceRecent(state.mmBookId, pageNum);
    }
}

let recentDebounceTimer = null;
function debounceRecent(bookId, pageNum) {
    clearTimeout(recentDebounceTimer);
    recentDebounceTimer = setTimeout(() => {
        if (!bookId || !pageNum) return;
        const mode = state.readerMode || "pali";
        let bookName = "";
        let chapter = "";
        let splitMMBookId = null;
        let splitMMBookName = null;
        let splitMMPage = null;

        if (mode === "mm") {
            bookName = state.mmBookName || bookId;
            chapter = getCurrentChapterName("mm", pageNum);
        } else if (mode === "split") {
            bookName = state.paliBookName || bookId;
            chapter = getCurrentChapterName("pali", pageNum);
            splitMMBookId = state.mmBookId;
            splitMMBookName = state.mmBookName;
            splitMMPage = state.mmPage;
        } else {
            bookName = state.paliBookName || bookId;
            chapter = getCurrentChapterName("pali", pageNum);
        }

        HistoryManager.recordReading({
            mode: mode,
            bookId: bookId,
            bookName: bookName,
            page: pageNum,
            chapterName: chapter,
            splitMMBookId: splitMMBookId,
            splitMMBookName: splitMMBookName,
            splitMMPage: splitMMPage
        });

        // Also ping backend /api/recent for backward compatibility
        fetch("/api/recent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ book_id: bookId, page_number: pageNum })
        }).catch(() => {});
    }, 600);
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
    if (el.splitRightContent) el.splitRightContent.style.fontSize = `${1.15 * (size / 100)}rem`;
    if (el.splitMMContent && el.splitMMContent !== el.splitRightContent) el.splitMMContent.style.fontSize = `${1.15 * (size / 100)}rem`;
    el.fontSizeDisplay.textContent = `${size}%`;
    const fsMobile = document.getElementById("fontSizeDisplayMobile");
    if (fsMobile) fsMobile.textContent = `${size}%`;
    localStorage.setItem("tipitaka_font_size", size.toString());
}

function toMyanmarNum(num) {
    const mmDigits = ['၀', '၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉'];
    return num.toString().replace(/\d/g, d => mmDigits[parseInt(d, 10)]);
}

function fromMyanmarNum(str) {
    if (!str) return 0;
    const mmDigits = {'၀': '0', '၁': '1', '၂': '2', '၃': '3', '၄': '4', '၅': '5', '၆': '6', '၇': '7', '၈': '8', '၉': '9'};
    const eng = str.toString().replace(/[၀-၉]/g, d => mmDigits[d] || d).replace(/[^\d]/g, '');
    return eng ? parseInt(eng, 10) : 0;
}

// Start app
window.addEventListener("DOMContentLoaded", initApp);
