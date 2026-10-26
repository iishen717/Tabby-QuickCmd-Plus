/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/qc-command.service.ts"
/*!***********************************!*\
  !*** ./src/qc-command.service.ts ***!
  \***********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   QuickCommandService: () => (/* binding */ QuickCommandService),
/* harmony export */   resolveSteps: () => (/* binding */ resolveSteps)
/* harmony export */ });
/**
 * 快捷命令数据服务
 * 功能描述：命令 CRUD + 分组管理 + localStorage 持久化
 * 创建人：iishen717
 * 创建时间：2026-06-26
 */
// ... existing interfaces ...
const STORAGE_KEY = 'qc-plus-commands-v1';
const GROUP_KEY = 'qc-plus-groups-v1';
const PINNED_ENTRY_POS_KEY = 'qc-plus-entry-pos';
const PANEL_POS_KEY = 'qc-plus-panel-pos';
const ENTRY_MODE_KEY = 'qc-plus-entry-mode';
/** 从命令中解析执行步骤列表（兼容旧版 text 模式 + sendCtrlC/sendCtrlCAfter） */
function resolveSteps(cmd) {
    var _a, _b;
    let steps;
    if (cmd.steps && cmd.steps.length > 0) {
        steps = cmd.steps.map(s => ({ text: s.text, delaySeconds: s.delaySeconds || 0, type: s.type || 'command' }));
    }
    else {
        const lines = cmd.text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length === 0)
            steps = [{ text: cmd.text, delaySeconds: 0, type: 'command' }];
        else {
            const globalDelay = cmd.delaySeconds || 0;
            steps = lines.map((line, i) => ({
                text: line,
                delaySeconds: i < lines.length - 1 ? globalDelay : 0,
                type: 'command',
            }));
        }
    }
    // 旧版兼容：sendCtrlC 在步骤前增加 break（如果首步还不是 break）
    if (cmd.sendCtrlC && ((_a = steps[0]) === null || _a === void 0 ? void 0 : _a.type) !== 'break') {
        steps = [{ text: '', delaySeconds: 0, type: 'break' }, ...steps];
    }
    // 旧版兼容：sendCtrlCAfter 在步骤后增加 break（如果末步还不是 break）
    if (cmd.sendCtrlCAfter && ((_b = steps[steps.length - 1]) === null || _b === void 0 ? void 0 : _b.type) !== 'break') {
        steps = [...steps, { text: '', delaySeconds: 0, type: 'break' }];
    }
    return steps;
}
class QuickCommandService {
    constructor() {
        this.commands = [];
        this.groups = [];
        this.load();
    }
    /* ---- 持久化 ---- */
    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw)
                this.commands = JSON.parse(raw);
        }
        catch (_a) {
            this.commands = [];
        }
        try {
            const raw = localStorage.getItem(GROUP_KEY);
            if (raw)
                this.groups = JSON.parse(raw);
        }
        catch (_b) {
            this.groups = [];
        }
    }
    /** 从 localStorage 重新加载数据（解决跨实例同步问题） */
    reload() {
        this.load();
    }
    saveCommands() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.commands));
    }
    saveGroups() {
        localStorage.setItem(GROUP_KEY, JSON.stringify(this.groups));
    }
    /* ---- 命令操作 ---- */
    getAll() {
        return [...this.commands];
    }
    getByGroup(group) {
        return this.commands.filter(c => c.group === group).sort((a, b) => b.usageCount - a.usageCount);
    }
    getBySSHProfile(profileId) {
        return this.commands.filter(c => {
            if (!c.sshProfiles || c.sshProfiles.length === 0)
                return true;
            return c.sshProfiles.includes(profileId);
        });
    }
    getPinned() {
        return this.commands.filter(c => c.pinned).slice(0, 3);
    }
    getById(id) {
        return this.commands.find(c => c.id === id);
    }
    add(cmd) {
        const now = Date.now();
        const newCmd = {
            ...cmd,
            id: 'qc_' + now + '_' + Math.random().toString(36).slice(2, 8),
            createdAt: now,
            updatedAt: now,
            usageCount: 0,
        };
        this.commands.push(newCmd);
        this.saveCommands();
        return newCmd;
    }
    update(id, partial) {
        const idx = this.commands.findIndex(c => c.id === id);
        if (idx === -1)
            return false;
        this.commands[idx] = { ...this.commands[idx], ...partial, updatedAt: Date.now() };
        this.saveCommands();
        return true;
    }
    remove(id) {
        const idx = this.commands.findIndex(c => c.id === id);
        if (idx === -1)
            return false;
        this.commands.splice(idx, 1);
        this.saveCommands();
        return true;
    }
    incrementUsage(id) {
        const cmd = this.commands.find(c => c.id === id);
        if (cmd) {
            cmd.usageCount = (cmd.usageCount || 0) + 1;
            this.saveCommands();
        }
    }
    reorder(ids) {
        const map = new Map(this.commands.map(c => [c.id, c]));
        const reordered = [];
        const seen = new Set();
        for (const id of ids) {
            const cmd = map.get(id);
            if (cmd && !seen.has(id)) {
                reordered.push(cmd);
                seen.add(id);
            }
        }
        // 补上未包含在 ids 中的命令（避免跨组拖动时丢失）
        for (const cmd of this.commands) {
            if (!seen.has(cmd.id)) {
                reordered.push(cmd);
                seen.add(cmd.id);
            }
        }
        this.commands = reordered;
        this.saveCommands();
    }
    /** 重排分组顺序（去重） */
    reorderGroups(names) {
        const deduped = [];
        const seen = new Set();
        for (const g of this.groups) {
            if (!seen.has(g.name)) {
                deduped.push(g);
                seen.add(g.name);
            }
        }
        this.groups = deduped;
        const map = new Map(this.groups.map(g => [g.name, g]));
        const reordered = [];
        const seen2 = new Set();
        for (const name of names) {
            const group = map.get(name);
            if (group && !seen2.has(name)) {
                reordered.push(group);
                seen2.add(name);
            }
        }
        for (const g of this.groups) {
            if (!seen2.has(g.name)) {
                reordered.push(g);
                seen2.add(g.name);
            }
        }
        this.groups = reordered;
        this.saveGroups();
    }
    /* ---- 分组操作 ---- */
    getGroups() {
        // 从命令中自动发现分组
        const usedGroups = new Set(this.commands.map(c => c.group).filter(Boolean));
        const merged = [];
        const seen = new Set();
        let hasUngrouped = false;
        // 先按已有顺序加载存在的组（去重：name='' 只取第一个）
        for (const g of this.groups) {
            if (seen.has(g.name))
                continue;
            seen.add(g.name);
            if (usedGroups.has(g.name)) {
                merged.push(g);
                usedGroups.delete(g.name);
            }
            else if (g.name && !usedGroups.has(g.name)) {
                // 保留空分组（有分组名但没有命令关联）
                merged.push(g);
            }
            else if (g.name === '' && !hasUngrouped) {
                hasUngrouped = true;
                merged.push(g);
            }
        }
        // 新分组追加
        for (const name of usedGroups) {
            merged.push({ name, expanded: true, order: merged.length });
        }
        // 确保"未分组"在最后（仅当有未分组命令且未添加过时才加）
        if (!hasUngrouped) {
            const hasUncategorized = this.commands.some(c => !c.group);
            if (hasUncategorized) {
                merged.push({ name: '', expanded: false, order: merged.length });
            }
        }
        // 清理重复数据后写回
        if (JSON.stringify(merged) !== JSON.stringify(this.groups)) {
            this.groups = merged;
            this.saveGroups();
        }
        // 按 order 排序
        this.groups.sort((a, b) => { var _a, _b; return ((_a = a.order) !== null && _a !== void 0 ? _a : 999) - ((_b = b.order) !== null && _b !== void 0 ? _b : 999); });
        this.saveGroups();
        return this.groups;
    }
    toggleGroupExpanded(name) {
        const g = this.groups.find(gr => gr.name === name);
        if (g)
            g.expanded = !g.expanded;
        else
            this.groups.push({ name, expanded: true, order: this.groups.length });
        this.saveGroups();
    }
    addGroup(name, order) {
        if (!name)
            return;
        if (!this.groups.find(g => g.name === name)) {
            this.groups.push({ name, expanded: true, order: order !== null && order !== void 0 ? order : this.groups.length });
            this.saveGroups();
        }
    }
    updateGroupOrder(name, order) {
        const g = this.groups.find(gr => gr.name === name);
        if (g) {
            g.order = order;
            this.saveGroups();
        }
    }
    removeGroup(name) {
        // 将属于该分组的命令移到"未分组"
        this.commands.forEach(c => {
            if (c.group === name)
                c.group = '';
        });
        this.saveCommands();
        const idx = this.groups.findIndex(g => g.name === name);
        if (idx !== -1)
            this.groups.splice(idx, 1);
        this.saveGroups();
    }
    renameGroup(oldName, newName) {
        if (!newName || oldName === newName)
            return;
        // 更新所有属于该分组的命令
        this.commands.forEach(c => {
            if (c.group === oldName)
                c.group = newName;
        });
        this.saveCommands();
        // 更新分组名
        const g = this.groups.find(gr => gr.name === oldName);
        if (g) {
            g.name = newName;
            this.saveGroups();
        }
    }
    /* ---- 入口位置 ---- */
    getEntryPosition() {
        try {
            const raw = localStorage.getItem(PINNED_ENTRY_POS_KEY);
            if (raw)
                return JSON.parse(raw);
        }
        catch ( /* ignore */_a) { /* ignore */ }
        return { x: 20, y: 60 };
    }
    saveEntryPosition(pos) {
        localStorage.setItem(PINNED_ENTRY_POS_KEY, JSON.stringify(pos));
    }
    getPanelPosition() {
        try {
            const raw = localStorage.getItem(PANEL_POS_KEY);
            if (raw)
                return JSON.parse(raw);
        }
        catch ( /* ignore */_a) { /* ignore */ }
        return { x: 20, y: 60 };
    }
    savePanelPosition(pos) {
        localStorage.setItem(PANEL_POS_KEY, JSON.stringify(pos));
    }
    /* ---- 按连接记忆位置 ---- */
    posMemoryKey(profileId) {
        return `qc-plus-pos-memory-${profileId}`;
    }
    getPositionMemory(profileId) {
        if (!profileId)
            return null;
        try {
            const raw = localStorage.getItem(this.posMemoryKey(profileId));
            if (raw)
                return JSON.parse(raw);
        }
        catch ( /* ignore */_a) { /* ignore */ }
        return null;
    }
    savePositionMemory(profileId, data) {
        if (!profileId)
            return;
        const existing = this.getPositionMemory(profileId) || { entryX: 20, entryY: 60, panelX: 20, panelY: 60, panelScrollTop: 0 };
        const merged = { ...existing, ...data };
        localStorage.setItem(this.posMemoryKey(profileId), JSON.stringify(merged));
    }
    clearPositionMemory(profileId) {
        if (!profileId)
            return;
        localStorage.removeItem(this.posMemoryKey(profileId));
    }
    hasPositionMemory(profileId) {
        if (!profileId)
            return false;
        try {
            return localStorage.getItem(this.posMemoryKey(profileId)) !== null;
        }
        catch (_a) {
            return false;
        }
    }
    togglePositionMemory(profileId) {
        if (this.hasPositionMemory(profileId)) {
            this.clearPositionMemory(profileId);
            return false; // now off
        }
        // 首次启用：保存当前位置
        this.savePositionMemory(profileId, {});
        return true; // now on
    }
    /* ---- 入口模式：浮动按钮 / 工具栏 ---- */
    getEntryMode() {
        try {
            const raw = localStorage.getItem(ENTRY_MODE_KEY);
            if (raw === 'toolbar')
                return 'toolbar';
            if (raw === 'floating')
                return 'floating';
        }
        catch ( /* ignore */_a) { /* ignore */ }
        return 'toolbar'; // 默认工具栏入口
    }
    saveEntryMode(mode) {
        localStorage.setItem(ENTRY_MODE_KEY, mode);
    }
    /* ---- 导入/导出 ---- */
    exportAll() {
        return JSON.stringify({ commands: this.commands, groups: this.groups }, null, 2);
    }
    importAll(json) {
        try {
            const data = JSON.parse(json);
            if (!data || typeof data !== 'object')
                return false;
            // 基本 schema 校验
            if (data.commands) {
                if (!Array.isArray(data.commands))
                    return false;
                for (const cmd of data.commands) {
                    if (!cmd.id || !cmd.name || cmd.text === undefined)
                        return false;
                }
            }
            if (data.groups) {
                if (!Array.isArray(data.groups))
                    return false;
                for (const g of data.groups) {
                    if (g.name === undefined)
                        return false;
                }
            }
            if (data.commands)
                this.commands = data.commands;
            if (data.groups)
                this.groups = data.groups;
            this.saveCommands();
            this.saveGroups();
            return true;
        }
        catch (_a) {
            return false;
        }
    }
}


/***/ },

/***/ "./src/qc-floating-panel.component.ts"
/*!********************************************!*\
  !*** ./src/qc-floating-panel.component.ts ***!
  \********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   QuickCommandFloatingPanel: () => (/* binding */ QuickCommandFloatingPanel)
/* harmony export */ });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "@angular/core");
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_angular_core__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _qc_command_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./qc-command.service */ "./src/qc-command.service.ts");
/* harmony import */ var _qc_i18n_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./qc-i18n.service */ "./src/qc-i18n.service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
/**
 * QuickCommand+ 浮动面板组件
 * 功能描述：浮动在终端上的快捷命令面板，支持搜索/分组/执行/最小化/拖拽
 * 创建人：iishen717
 * 创建时间：2026-06-26
 */



let QuickCommandFloatingPanel = class QuickCommandFloatingPanel {
    constructor() {
        this.svc = new _qc_command_service__WEBPACK_IMPORTED_MODULE_1__.QuickCommandService();
        this.i18n = new _qc_i18n_service__WEBPACK_IMPORTED_MODULE_2__.QuickCommandI18nService();
        this.destroyed = false;
        this.minimized = false;
        this.panelX = 20;
        this.panelY = 60;
        /** 面板宽度，从 localStorage 恢复，默认 320 */
        this.panelWidth = +(localStorage.getItem('qc-plus-panel-width') || '320');
        /** 面板高度，0 表示自动（不固定），拖拽后持久化 */
        this.panelHeight = +(localStorage.getItem('qc-plus-panel-height') || '0');
        this.resizing = null;
        this.resizeMoveHandler = null;
        this.resizeUpHandler = null;
        this.searchText = '';
        this.filterGroup = '';
        this.showGroupDropdown = false;
        this.filterMenuX = 0;
        this.filterMenuY = 0;
        this.showEditGroupDropdown = false;
        this.editGroupMenuX = 0;
        this.editGroupMenuY = 0;
        this.highlightedId = '';
        this.commands = [];
        this.groups = [];
        this.filteredCommands = [];
        this.pinnedCommands = [];
        this.sshHost = '';
        this.terminalRef = null;
        this.profileId = '';
        this.onClose = null;
        this.onMinimize = null;
        this.posMemoryOn = false;
        this.dragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.dragMoveHandler = null;
        this.dragUpHandler = null;
        this.onLocaleChanged = () => {
            this.i18n = new _qc_i18n_service__WEBPACK_IMPORTED_MODULE_2__.QuickCommandI18nService();
            this.loadData();
        };
        this.onDataChanged = () => {
            this.loadData();
        };
        this.showEditModal = false;
        this.editCmd = { name: '', text: '' };
        this.showParamModal = false;
        this.paramModalCmd = null;
        this.paramModalParams = [];
        this.paramModalValues = {};
        this.paramModalForceExecute = false;
        this.showGroupRename = false;
        this.groupRenameIsNew = false;
        this.groupRenameOldName = '';
        this.groupRenameValue = '';
        this.groupRenameOrder = 0;
        this.showMultiStepHint = false;
        this.multiStepCount = 0;
        this.multiStepCmd = null;
        /* ---- 步骤拖拽排序 ---- */
        this.stepDragIdx = null;
        this.dragCmdId = null;
        this.listDropOver = false;
    }
    get allGroups() {
        return this.groups;
    }
    get displayGroups() {
        return this.groups.filter(g => {
            if (this.filterGroup === '__ungrouped__') {
                if (g.name !== '')
                    return false;
            }
            else if (this.filterGroup) {
                if (g.name !== this.filterGroup)
                    return false;
            }
            if (this.searchText) {
                const cmds = this.getGroupCommands(g.name);
                return cmds.length > 0;
            }
            return true;
        });
    }
    get selectedCount() {
        return this.filteredCommands.length;
    }
    ngOnInit() {
        this.loadData();
        this.initTerminalInfo();
        window.addEventListener('qc-plus-locale-changed', this.onLocaleChanged);
        window.addEventListener('qc-plus-data-changed', this.onDataChanged);
    }
    applyPositionMemory() {
        this.initTerminalInfo();
        this.posMemoryOn = this.profileId ? this.svc.hasPositionMemory(this.profileId) : false;
        this.restorePosition();
        this.loadData();
    }
    initTerminalInfo() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        if (this.terminalRef) {
            try {
                const ssh = (_d = (_b = (_a = this.terminalRef) === null || _a === void 0 ? void 0 : _a.sshSession) !== null && _b !== void 0 ? _b : (_c = this.terminalRef) === null || _c === void 0 ? void 0 : _c._session) !== null && _d !== void 0 ? _d : null;
                if (ssh) {
                    this.sshHost = ssh.host || ((_e = ssh.options) === null || _e === void 0 ? void 0 : _e.host) || '';
                    if (this.sshHost)
                        this.sshHost = '@' + this.sshHost;
                }
            }
            catch ( /* ignore */_m) { /* ignore */ }
        }
        if (!this.profileId && ((_g = (_f = this.terminalRef) === null || _f === void 0 ? void 0 : _f.profile) === null || _g === void 0 ? void 0 : _g.id)) {
            this.profileId = this.terminalRef.profile.id;
        }
        if (!this.profileId && this.terminalRef) {
            try {
                const ssh = (_l = (_j = (_h = this.terminalRef) === null || _h === void 0 ? void 0 : _h.sshSession) !== null && _j !== void 0 ? _j : (_k = this.terminalRef) === null || _k === void 0 ? void 0 : _k._session) !== null && _l !== void 0 ? _l : null;
                if (ssh === null || ssh === void 0 ? void 0 : ssh.host)
                    this.profileId = 'ssh:' + ssh.host;
            }
            catch ( /* ignore */_o) { /* ignore */ }
        }
    }
    ngOnDestroy() {
        this.destroyed = true;
        this.savePosMemory();
        window.removeEventListener('qc-plus-locale-changed', this.onLocaleChanged);
        window.removeEventListener('qc-plus-data-changed', this.onDataChanged);
        this.cleanDrag();
        this.cleanResize();
    }
    loadData() {
        this.svc.reload();
        this.commands = this.svc.getAll();
        this.groups = this.svc.getGroups();
        this.pinnedCommands = this.svc.getPinned();
        if (this.filterGroup) {
            const valid = this.groups.some(g => this.filterGroup === '__ungrouped__' ? !g.name : g.name === this.filterGroup);
            if (!valid)
                this.filterGroup = '';
        }
        this.onSearch();
    }
    /** 获取分组筛选下拉当前显示的文字 */
    getFilterGroupLabel() {
        if (!this.filterGroup || this.filterGroup === '')
            return this.i18n.t('app.all_groups');
        if (this.filterGroup === '__ungrouped__')
            return this.i18n.t('app.ungrouped');
        return this.filterGroup;
    }
    /** 切换分组下拉，计算菜单位置 */
    toggleFilterDropdown(triggerEl) {
        if (this.showGroupDropdown) {
            this.showGroupDropdown = false;
            return;
        }
        const rect = triggerEl.getBoundingClientRect();
        this.filterMenuX = rect.left;
        this.filterMenuY = rect.bottom + 4;
        this.showGroupDropdown = true;
    }
    /** 编辑弹窗内分组下拉 */
    toggleEditGroupDropdown(triggerEl) {
        if (this.showEditGroupDropdown) {
            this.showEditGroupDropdown = false;
            return;
        }
        const rect = triggerEl.getBoundingClientRect();
        this.editGroupMenuX = rect.left;
        this.editGroupMenuY = rect.bottom + 4;
        this.showEditGroupDropdown = true;
    }
    onSearch() {
        let filtered = this.commands;
        if (this.searchText) {
            const q = this.searchText.toLowerCase();
            filtered = filtered.filter(c => (c.name || '').toLowerCase().includes(q) ||
                (c.text || '').toLowerCase().includes(q));
        }
        if (this.filterGroup === '__ungrouped__') {
            filtered = filtered.filter(c => !c.group);
        }
        else if (this.filterGroup) {
            filtered = filtered.filter(c => c.group === this.filterGroup);
        }
        this.filteredCommands = filtered;
    }
    getGroupCommands(groupName) {
        return this.filteredCommands.filter(c => (c.group || '') === (groupName || ''));
    }
    getPreview(cmd) {
        const text = cmd.text.replace(/\n/g, ' \u21B5 ');
        return text.length > 35 ? text.slice(0, 35) + '...' : text;
    }
    toggleGroup(name) {
        const target = this.groups.find(g => g.name === name);
        if (!target)
            return;
        const willExpand = !target.expanded;
        if (willExpand) {
            // 手风琴：收起所有已展开的分组
            this.groups.forEach(g => { if (g.expanded && g.name !== name)
                this.svc.toggleGroupExpanded(g.name); });
        }
        this.svc.toggleGroupExpanded(name);
        this.groups = this.svc.getGroups();
    }
    executeFirst() {
        if (this.filteredCommands.length > 0) {
            this.executeCommand(this.filteredCommands[0]);
        }
    }
    onQuickBarWheel(event) {
        const el = event.currentTarget;
        if (!el)
            return;
        event.preventDefault();
        el.scrollLeft += event.deltaY;
    }
    executeCommand(cmd) {
        if (!this.terminalRef)
            return;
        if (cmd.params && cmd.params.length > 0) {
            this.paramModalCmd = cmd;
            this.paramModalParams = [...cmd.params];
            this.paramModalValues = {};
            this.paramModalForceExecute = false;
            this.showParamModal = true;
            return;
        }
        this.sendCommand(cmd, cmd.text, false);
    }
    executeAlways(cmd) {
        if (!this.terminalRef)
            return;
        if (cmd.params && cmd.params.length > 0) {
            this.paramModalCmd = cmd;
            this.paramModalParams = [...cmd.params];
            this.paramModalValues = {};
            this.paramModalForceExecute = true;
            this.showParamModal = true;
            return;
        }
        this.sendCommand(cmd, cmd.text, true);
    }
    confirmParamModal() {
        if (!this.paramModalCmd)
            return;
        let text = this.paramModalCmd.text;
        for (const p of this.paramModalParams) {
            const val = this.paramModalValues[p] || '';
            text = text.split('${' + p + '}').join(val);
        }
        this.sendCommand(this.paramModalCmd, text, this.paramModalForceExecute);
        this.closeParamModal();
    }
    closeParamModal() {
        this.showParamModal = false;
        this.paramModalCmd = null;
        this.paramModalParams = [];
        this.paramModalValues = {};
    }
    sendToLine(cmd) {
        var _a;
        if (!this.terminalRef)
            return;
        const steps = (0,_qc_command_service__WEBPACK_IMPORTED_MODULE_1__.resolveSteps)({ ...cmd, steps: cmd.steps, text: cmd.text });
        if (steps.length > 1) {
            this.multiStepCmd = cmd;
            this.multiStepCount = steps.length;
            this.showMultiStepHint = true;
            return;
        }
        this.sendLineText(((_a = steps[0]) === null || _a === void 0 ? void 0 : _a.text) || cmd.text);
    }
    confirmMultiStepJoin() {
        if (!this.multiStepCmd)
            return;
        const steps = (0,_qc_command_service__WEBPACK_IMPORTED_MODULE_1__.resolveSteps)({ ...this.multiStepCmd, steps: this.multiStepCmd.steps, text: this.multiStepCmd.text });
        const joined = steps.map(s => s.text).filter(Boolean).join(' && ');
        if (joined)
            this.sendLineText(joined);
        this.cancelMultiStepHint();
    }
    cancelMultiStepHint() {
        this.showMultiStepHint = false;
        this.multiStepCmd = null;
        this.multiStepCount = 0;
    }
    sendLineText(text) {
        var _a, _b, _c, _d, _e, _f;
        if (!text)
            return;
        try {
            let sent = false;
            if (typeof this.terminalRef.sendInput === 'function') {
                this.terminalRef.sendInput(text);
                sent = true;
            }
            else if (typeof this.terminalRef.write === 'function') {
                this.terminalRef.write(text);
                sent = true;
            }
            else {
                const ssh = (_d = (_b = (_a = this.terminalRef) === null || _a === void 0 ? void 0 : _a.sshSession) !== null && _b !== void 0 ? _b : (_c = this.terminalRef) === null || _c === void 0 ? void 0 : _c._session) !== null && _d !== void 0 ? _d : null;
                if (ssh && typeof ssh.write === 'function') {
                    ssh.write(text);
                    sent = true;
                }
            }
            if (!sent) {
                const hostEl = (_f = (_e = this.terminalRef) === null || _e === void 0 ? void 0 : _e.element) === null || _f === void 0 ? void 0 : _f.nativeElement;
                if (hostEl) {
                    const input = hostEl.querySelector('.xterm-helper-textarea, .xterm textarea, textarea, input');
                    if (input) {
                        input.focus();
                        input.value = text;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        sent = true;
                    }
                }
            }
            if (sent)
                this.focusTerminal();
        }
        catch (e) {
            console.warn('[QC+] sendLineText error', e);
        }
    }
    sendCommand(cmd, text, forceExecute = false) {
        this.svc.incrementUsage(cmd.id);
        const steps = (0,_qc_command_service__WEBPACK_IMPORTED_MODULE_1__.resolveSteps)({ ...cmd, steps: cmd.steps, text });
        if (steps.length === 0)
            return;
        this.executeSteps(cmd, steps, 0, forceExecute);
    }
    sendRawBreak(onDone) {
        var _a, _b, _c, _d, _e, _f;
        try {
            const ctrlC = '\x03';
            let sent = false;
            if (typeof this.terminalRef.sendInput === 'function') {
                this.terminalRef.sendInput(ctrlC);
                sent = true;
            }
            else if (typeof this.terminalRef.write === 'function') {
                this.terminalRef.write(ctrlC);
                sent = true;
            }
            else {
                const ssh = (_d = (_b = (_a = this.terminalRef) === null || _a === void 0 ? void 0 : _a.sshSession) !== null && _b !== void 0 ? _b : (_c = this.terminalRef) === null || _c === void 0 ? void 0 : _c._session) !== null && _d !== void 0 ? _d : null;
                if (ssh && typeof ssh.write === 'function') {
                    ssh.write(ctrlC);
                    sent = true;
                }
            }
            if (!sent) {
                const hostEl = (_f = (_e = this.terminalRef) === null || _e === void 0 ? void 0 : _e.element) === null || _f === void 0 ? void 0 : _f.nativeElement;
                if (hostEl) {
                    const input = hostEl.querySelector('.xterm-helper-textarea, .xterm textarea, textarea, input');
                    if (input) {
                        input.focus();
                        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', code: 'KeyC', ctrlKey: true, bubbles: true }));
                        input.dispatchEvent(new KeyboardEvent('keypress', { key: 'c', code: 'KeyC', ctrlKey: true, bubbles: true }));
                        input.dispatchEvent(new KeyboardEvent('keyup', { key: 'c', code: 'KeyC', ctrlKey: true, bubbles: true }));
                    }
                }
            }
        }
        catch ( /* ignore */_g) { /* ignore */ }
        setTimeout(onDone, 100);
    }
    executeSteps(cmd, steps, idx, forceExecute = false) {
        var _a, _b, _c, _d, _e, _f;
        if (this.destroyed)
            return;
        if (idx >= steps.length) {
            this.focusTerminal();
            return;
        }
        const step = steps[idx];
        const line = step.text;
        const isLast = idx === steps.length - 1;
        const appendLine = forceExecute ? true : (isLast ? (cmd.appendCR !== false) : true);
        // break 类型：发送 Ctrl+C 中断
        if (step.type === 'break') {
            // 延时执行：给 pty 行规程足够时间处理上一步的 \n
            // 防止 \x03 在同一个 n_tty_receive_buf 调用中覆盖 \n 的效果
            setTimeout(() => {
                this.sendRawBreak(() => {
                    const nextDelay = step.delaySeconds || 0;
                    if (nextDelay > 0) {
                        setTimeout(() => this.executeSteps(cmd, steps, idx + 1, forceExecute), nextDelay * 1000);
                    }
                    else {
                        this.executeSteps(cmd, steps, idx + 1, forceExecute);
                    }
                });
            }, 150);
            return;
        }
        try {
            let sent = false;
            if (typeof this.terminalRef.sendInput === 'function') {
                this.terminalRef.sendInput(line);
                if (appendLine)
                    this.terminalRef.sendInput('\n');
                sent = true;
            }
            else if (typeof this.terminalRef.write === 'function') {
                this.terminalRef.write(line);
                if (appendLine)
                    this.terminalRef.write('\n');
                sent = true;
            }
            else {
                const ssh = (_d = (_b = (_a = this.terminalRef) === null || _a === void 0 ? void 0 : _a.sshSession) !== null && _b !== void 0 ? _b : (_c = this.terminalRef) === null || _c === void 0 ? void 0 : _c._session) !== null && _d !== void 0 ? _d : null;
                if (ssh && typeof ssh.write === 'function') {
                    ssh.write(line);
                    if (appendLine)
                        ssh.write('\n');
                    sent = true;
                }
            }
            if (!sent) {
                const hostEl = (_f = (_e = this.terminalRef) === null || _e === void 0 ? void 0 : _e.element) === null || _f === void 0 ? void 0 : _f.nativeElement;
                if (hostEl) {
                    const input = hostEl.querySelector('.xterm-helper-textarea, .xterm textarea, textarea, input');
                    if (input) {
                        input.focus();
                        input.value = line;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        if (appendLine)
                            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
                        sent = true;
                    }
                }
            }
            if (!sent && idx === 0)
                console.warn('[QC+] No terminal input method available');
            if (idx + 1 < steps.length) {
                const nextDelay = step.delaySeconds || 0;
                if (nextDelay > 0) {
                    setTimeout(() => this.executeSteps(cmd, steps, idx + 1, forceExecute), nextDelay * 1000);
                }
                else {
                    this.executeSteps(cmd, steps, idx + 1, forceExecute);
                }
            }
            else {
                // 所有步骤执行完毕，进入 idx>=length 守卫回收焦点
                this.executeSteps(cmd, steps, idx + 1, forceExecute);
            }
        }
        catch (e) {
            console.warn('[QC+] executeSteps error', e);
        }
    }
    focusTerminal() {
        var _a, _b;
        try {
            const hostEl = (_b = (_a = this.terminalRef) === null || _a === void 0 ? void 0 : _a.element) === null || _b === void 0 ? void 0 : _b.nativeElement;
            if (!hostEl)
                return;
            const input = hostEl.querySelector('.xterm-helper-textarea, .xterm textarea, textarea, input');
            if (input)
                input.focus();
        }
        catch ( /* ignore */_c) { /* ignore */ }
    }
    addCommand() {
        this.editCmd = { name: '', text: '', group: '', appendCR: true, pinned: false, steps: [{ text: '', delaySeconds: 0, type: 'command' }] };
        this.showEditModal = true;
    }
    addCommandToGroup(groupName) {
        this.editCmd = { name: '', text: '', group: groupName || '', appendCR: true, pinned: false, steps: [{ text: '', delaySeconds: 0, type: 'command' }] };
        this.showEditModal = true;
    }
    editCommand(cmd) {
        this.editCmd = JSON.parse(JSON.stringify(cmd));
        if (!this.editCmd.steps || this.editCmd.steps.length === 0) {
            if (this.editCmd.text) {
                const lines = this.editCmd.text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
                const globalDelay = this.editCmd.delaySeconds || 0;
                this.editCmd.steps = lines.map((line, i) => ({ text: line, delaySeconds: i < lines.length - 1 ? globalDelay : 0 }));
            }
            else {
                this.editCmd.steps = [{ text: '', delaySeconds: 0 }];
            }
        }
        this.showEditModal = true;
        // 等待 DOM 渲染后自动调整 textarea 高度
        setTimeout(() => {
            document.querySelectorAll('.qc-step-input').forEach(el => {
                const ta = el;
                if (ta.scrollHeight > ta.clientHeight) {
                    ta.style.height = ta.scrollHeight + 'px';
                }
            });
        }, 50);
    }
    copyCommandText(cmd) {
        var _a;
        const steps = (0,_qc_command_service__WEBPACK_IMPORTED_MODULE_1__.resolveSteps)(cmd);
        const text = steps.length > 0 ? steps[0].text : cmd.text;
        try {
            (_a = navigator.clipboard) === null || _a === void 0 ? void 0 : _a.writeText(text);
        }
        catch (_b) { }
    }
    onResetUsage() {
        var _a;
        if (!((_a = this.editCmd) === null || _a === void 0 ? void 0 : _a.id))
            return;
        this.svc.update(this.editCmd.id, { usageCount: 0 });
        this.editCmd.usageCount = 0;
    }
    get editCmdSteps() { var _a; return ((_a = this.editCmd) === null || _a === void 0 ? void 0 : _a.steps) || []; }
    set editCmdSteps(v) { this.editCmd.steps = v; }
    addStep() { this.editCmd.steps.push({ text: '', delaySeconds: 0, type: 'command' }); }
    addBreakStep() { this.editCmd.steps.push({ text: '', delaySeconds: 1, type: 'break' }); }
    autoGrow(event) {
        const ta = event.target;
        ta.style.height = ta.scrollHeight + 'px';
    }
    removeStep(index) {
        this.editCmd.steps.splice(index, 1);
        if (this.editCmd.steps.length === 0)
            this.editCmd.steps.push({ text: '', delaySeconds: 0 });
    }
    onStepDragStart(event, idx) {
        this.stepDragIdx = idx;
        event.dataTransfer.effectAllowed = 'move';
    }
    onStepDragOver(event, idx) {
        var _a;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        const el = event.currentTarget;
        const rows = (_a = el.parentElement) === null || _a === void 0 ? void 0 : _a.querySelectorAll('.qc-step-row');
        rows === null || rows === void 0 ? void 0 : rows.forEach(r => r.classList.remove('drag-over', 'drag-over-bottom'));
        const rect = el.getBoundingClientRect();
        const y = event.clientY - rect.top;
        if (y > rect.height / 2) {
            el.classList.add('drag-over-bottom');
        }
        else {
            el.classList.add('drag-over');
        }
    }
    onStepDragLeave(event) {
        ;
        event.currentTarget.classList.remove('drag-over', 'drag-over-bottom');
    }
    onStepDragEnd() {
        this.stepDragIdx = null;
        document.querySelectorAll('.qc-step-row.drag-over, .qc-step-row.drag-over-bottom').forEach(el => el.classList.remove('drag-over', 'drag-over-bottom'));
    }
    onStepDrop(event, idx) {
        event.preventDefault();
        if (this.stepDragIdx === null) {
            this.onStepDragEnd();
            return;
        }
        const steps = this.editCmd.steps;
        const rect = event.currentTarget.getBoundingClientRect();
        const y = event.clientY - rect.top;
        const dropAfter = y > rect.height / 2;
        let targetIdx = idx;
        if (dropAfter)
            targetIdx = idx + 1;
        if (this.stepDragIdx === targetIdx || this.stepDragIdx === targetIdx - 1) {
            this.onStepDragEnd();
            return;
        }
        const [moved] = steps.splice(this.stepDragIdx, 1);
        const insertAt = this.stepDragIdx < targetIdx ? targetIdx - 1 : targetIdx;
        steps.splice(insertAt, 0, moved);
        this.onStepDragEnd();
    }
    saveEditCmd() {
        if (!this.editCmd.name || !this.editCmd.name.trim())
            return;
        const steps = this.editCmd.steps || [];
        const text = steps.map((s) => s.text).join('\n');
        if (!text.trim())
            return;
        const updateData = {
            name: this.editCmd.name.trim(), text: text.trim(), group: this.editCmd.group || '',
            appendCR: this.editCmd.appendCR !== false, pinned: !!this.editCmd.pinned,
            sendCtrlC: false, sendCtrlCAfter: false, // 步骤模式下清除旧版兼容字段，避免 resolveSteps 追加重复 break
            steps: steps.map((s) => ({ text: s.text, delaySeconds: Math.max(0, +(s.delaySeconds || 0)), type: s.type || 'command' })),
        };
        if (this.editCmd.id) {
            this.svc.update(this.editCmd.id, updateData);
        }
        else {
            this.svc.add({ ...updateData, params: [], sshProfiles: [] });
        }
        this.showEditModal = false;
        this.searchText = '';
        this.loadData();
    }
    closeEditModal() { this.showEditModal = false; this.showEditGroupDropdown = false; }
    getParamBadge(cmd) {
        var _a;
        const count = ((_a = cmd.params) === null || _a === void 0 ? void 0 : _a.length) || 0;
        return count > 1 ? `${count} vars` : '${...}';
    }
    onDragStart(event, cmd) {
        var _a;
        this.dragCmdId = cmd.id;
        (_a = event.dataTransfer) === null || _a === void 0 ? void 0 : _a.setData('text/plain', cmd.id);
        event.dataTransfer.effectAllowed = 'move';
    }
    onDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        const el = event.currentTarget;
        const y = event.clientY - el.getBoundingClientRect().top;
        const dropBottom = y > el.offsetHeight / 2;
        document.querySelectorAll('.qc-cmd-row.drag-over, .qc-cmd-row.drag-over-bottom, .qc-group-header.drag-over').forEach(r => r.classList.remove('drag-over', 'drag-over-bottom'));
        el.classList.add(dropBottom ? 'drag-over-bottom' : 'drag-over');
    }
    onDragLeave(event) { event.currentTarget.classList.remove('drag-over', 'drag-over-bottom'); }
    onDrop(event, targetCmd) {
        var _a;
        event.preventDefault();
        this.cleanDragStyles();
        const srcId = this.dragCmdId || ((_a = event.dataTransfer) === null || _a === void 0 ? void 0 : _a.getData('text/plain'));
        if (!srcId || srcId === targetCmd.id)
            return;
        const allCmds = this.commands;
        const srcIdx = allCmds.findIndex(c => c.id === srcId);
        const tgtIdx = allCmds.findIndex(c => c.id === targetCmd.id);
        if (srcIdx === -1 || tgtIdx === -1)
            return;
        const srcCmd = allCmds[srcIdx];
        if ((srcCmd.group || '') !== (targetCmd.group || '')) {
            this.svc.update(srcCmd.id, { group: targetCmd.group || '' });
            srcCmd.group = targetCmd.group || '';
        }
        // 检测鼠标位置决定插入到目标上方还是下方
        const el = event.currentTarget;
        const y = event.clientY - el.getBoundingClientRect().top;
        const dropAfter = y > el.offsetHeight / 2;
        const [moved] = allCmds.splice(srcIdx, 1);
        const adjustedTgt = tgtIdx > srcIdx ? tgtIdx - 1 : tgtIdx;
        const insertAt = dropAfter ? adjustedTgt + 1 : adjustedTgt;
        allCmds.splice(insertAt, 0, moved);
        this.svc.reorder(allCmds.map(c => c.id));
        this.loadData();
    }
    onDropToGroup(event, groupName) {
        var _a;
        event.preventDefault();
        this.cleanDragStyles();
        const srcId = this.dragCmdId || ((_a = event.dataTransfer) === null || _a === void 0 ? void 0 : _a.getData('text/plain'));
        if (!srcId)
            return;
        const srcCmd = this.commands.find(c => c.id === srcId);
        if (!srcCmd || (srcCmd.group || '') === (groupName || ''))
            return;
        this.svc.update(srcCmd.id, { group: groupName || '' });
        const allIds = this.commands.map(c => c.id);
        const idx = allIds.indexOf(srcId);
        if (idx !== -1)
            allIds.splice(idx, 1);
        allIds.push(srcId);
        this.svc.reorder(allIds);
        this.loadData();
    }
    onDragEnd(event) { this.dragCmdId = null; this.cleanDragStyles(); this.listDropOver = false; }
    onListDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        this.listDropOver = true;
    }
    onListDragLeave(event) {
        this.listDropOver = false;
    }
    onListDrop(event, groupName) {
        var _a;
        event.preventDefault();
        this.listDropOver = false;
        this.cleanDragStyles();
        const srcId = this.dragCmdId || ((_a = event.dataTransfer) === null || _a === void 0 ? void 0 : _a.getData('text/plain'));
        if (!srcId)
            return;
        const srcCmd = this.commands.find(c => c.id === srcId);
        if (!srcCmd)
            return;
        if ((srcCmd.group || '') !== (groupName || '')) {
            this.svc.update(srcCmd.id, { group: groupName || '' });
            srcCmd.group = groupName || '';
        }
        const allIds = this.commands.map(c => c.id);
        const idx = allIds.indexOf(srcId);
        if (idx !== -1)
            allIds.splice(idx, 1);
        allIds.push(srcId);
        this.svc.reorder(allIds);
        this.loadData();
    }
    cleanDragStyles() {
        document.querySelectorAll('.qc-cmd-row.dragging, .qc-cmd-row.drag-over, .qc-cmd-row.drag-over-bottom, .qc-group-header.drag-over')
            .forEach(el => el.classList.remove('dragging', 'drag-over', 'drag-over-bottom'));
    }
    showGroupRenameDialog(oldName) {
        var _a;
        this.groupRenameIsNew = false;
        this.groupRenameOldName = oldName;
        this.groupRenameValue = oldName;
        const g = this.svc.getGroups().find(gr => gr.name === oldName);
        this.groupRenameOrder = (_a = g === null || g === void 0 ? void 0 : g.order) !== null && _a !== void 0 ? _a : 0;
        this.showGroupRename = true;
    }
    deleteGroup(name) {
        if (name && !confirm(this.i18n.t('group.delete_confirm', { name })))
            return;
        this.svc.removeGroup(name);
        this.loadData();
    }
    deleteCommand(cmd) {
        if (!confirm(this.i18n.t('panel.delete_confirm', { name: cmd.name })))
            return;
        this.svc.remove(cmd.id);
        this.loadData();
    }
    confirmGroupRename() {
        var _a;
        const newName = (_a = this.groupRenameValue) === null || _a === void 0 ? void 0 : _a.trim();
        if (this.groupRenameIsNew) {
            if (newName)
                this.svc.addGroup(newName, this.groupRenameOrder);
        }
        else {
            if (!newName || newName === this.groupRenameOldName) {
                // 名称没变，只更新排序
                this.svc.updateGroupOrder(this.groupRenameOldName, this.groupRenameOrder);
                this.closeGroupRename();
                this.loadData();
                return;
            }
            this.svc.renameGroup(this.groupRenameOldName, newName);
            this.svc.updateGroupOrder(newName, this.groupRenameOrder);
        }
        this.closeGroupRename();
        this.loadData();
    }
    closeGroupRename() { this.showGroupRename = false; this.groupRenameIsNew = false; this.groupRenameOldName = ''; this.groupRenameValue = ''; this.groupRenameOrder = 0; }
    addNewGroup() { this.groupRenameIsNew = true; this.groupRenameOldName = ''; this.groupRenameValue = ''; this.groupRenameOrder = 0; this.showGroupRename = true; }
    startDrag(event) {
        var _a, _b;
        if (event.button !== 0)
            return;
        this.dragging = true;
        this.dragOffsetX = event.clientX - this.panelX;
        this.dragOffsetY = event.clientY - this.panelY;
        const hostEl = (_b = (_a = this.terminalRef) === null || _a === void 0 ? void 0 : _a.element) === null || _b === void 0 ? void 0 : _b.nativeElement;
        this.dragMoveHandler = (ev) => {
            if (!this.dragging)
                return;
            let x = ev.clientX - this.dragOffsetX;
            let y = ev.clientY - this.dragOffsetY;
            if (hostEl) {
                const panelEl = hostEl.querySelector('.qc-panel');
                const ph = (panelEl === null || panelEl === void 0 ? void 0 : panelEl.offsetHeight) || 200;
                const pw = (panelEl === null || panelEl === void 0 ? void 0 : panelEl.offsetWidth) || 320;
                const maxX = Math.max(0, hostEl.clientWidth - pw - 4);
                const maxY = Math.max(0, hostEl.clientHeight - ph - 4);
                x = Math.max(0, Math.min(x, maxX));
                y = Math.max(0, Math.min(y, maxY));
            }
            this.panelX = x;
            this.panelY = y;
        };
        this.dragUpHandler = () => {
            this.dragging = false;
            if (this.posMemoryOn && this.profileId) {
                this.svc.savePositionMemory(this.profileId, { panelX: this.panelX, panelY: this.panelY });
            }
            else {
                this.svc.savePanelPosition({ x: this.panelX, y: this.panelY });
            }
            this.cleanDrag();
        };
        document.addEventListener('mousemove', this.dragMoveHandler);
        document.addEventListener('mouseup', this.dragUpHandler);
    }
    cleanDrag() {
        if (this.dragMoveHandler) {
            document.removeEventListener('mousemove', this.dragMoveHandler);
            this.dragMoveHandler = null;
        }
        if (this.dragUpHandler) {
            document.removeEventListener('mouseup', this.dragUpHandler);
            this.dragUpHandler = null;
        }
    }
    /* ---- 面板大小调整 ---- */
    startResize(event, dir) {
        if (event.button !== 0)
            return;
        event.preventDefault();
        event.stopPropagation();
        const panelEl = event.currentTarget.closest('.qc-panel');
        const startH = this.panelHeight || (panelEl === null || panelEl === void 0 ? void 0 : panelEl.offsetHeight) || 420;
        this.resizing = { dir, startW: this.panelWidth, startH, lastX: event.clientX, lastY: event.clientY };
        this.resizeMoveHandler = (ev) => {
            var _a, _b;
            if (!this.resizing)
                return;
            const dx = ev.clientX - this.resizing.lastX;
            const dy = ev.clientY - this.resizing.lastY;
            this.resizing.lastX = ev.clientX;
            this.resizing.lastY = ev.clientY;
            const dir = this.resizing.dir;
            // 获取容器边界约束
            const hostEl = (_b = (_a = this.terminalRef) === null || _a === void 0 ? void 0 : _a.element) === null || _b === void 0 ? void 0 : _b.nativeElement;
            const maxW = hostEl ? hostEl.clientWidth : 9999;
            const maxH = hostEl ? hostEl.clientHeight : 9999;
            let newW = this.panelWidth;
            let newH = this.panelHeight || this.resizing.startH;
            // E/SE/NE：右边缘不超出容器
            if (dir.includes('e')) {
                const limit = maxW - this.panelX;
                newW = Math.max(300, Math.min(newW + dx, limit));
            }
            // W/NW/SW：左边缘不超出容器左边界
            if (dir.includes('w')) {
                const maxShrink = newW - 300;
                const leftLimit = this.panelX;
                const dw = Math.max(Math.min(dx, maxShrink, leftLimit), -maxShrink);
                newW -= dw;
                this.panelX += dw;
            }
            // S/SW/SE：下边缘不超出容器
            if (dir.includes('s')) {
                const limit = maxH - this.panelY;
                newH = Math.max(400, Math.min(newH + dy, limit));
            }
            // N/NE/NW：上边缘不超出容器上边界
            if (dir.includes('n')) {
                const maxShrink = newH - 400;
                const topLimit = this.panelY;
                const dh = Math.max(Math.min(dy, maxShrink, topLimit), -maxShrink);
                newH -= dh;
                this.panelY += dh;
            }
            this.panelWidth = Math.round(newW);
            this.panelHeight = Math.round(newH);
        };
        this.resizeUpHandler = () => {
            localStorage.setItem('qc-plus-panel-width', String(this.panelWidth));
            localStorage.setItem('qc-plus-panel-height', String(this.panelHeight || '0'));
            this.resizing = null;
            this.cleanResize();
        };
        document.addEventListener('mousemove', this.resizeMoveHandler);
        document.addEventListener('mouseup', this.resizeUpHandler);
    }
    cleanResize() {
        if (this.resizeMoveHandler) {
            document.removeEventListener('mousemove', this.resizeMoveHandler);
            this.resizeMoveHandler = null;
        }
        if (this.resizeUpHandler) {
            document.removeEventListener('mouseup', this.resizeUpHandler);
            this.resizeUpHandler = null;
        }
    }
    restorePosition() {
        if (this.posMemoryOn && this.profileId) {
            const mem = this.svc.getPositionMemory(this.profileId);
            if (mem) {
                this.panelX = Math.max(0, mem.panelX || 20);
                this.panelY = Math.max(0, mem.panelY || 60);
                if (mem.filterGroup !== undefined)
                    this.filterGroup = mem.filterGroup;
                if (this.filterGroup && this.filterGroup !== '__ungrouped__') {
                    if (!this.groups.some(g => g.name === this.filterGroup))
                        this.filterGroup = '';
                }
                if (mem.groupExpanded) {
                    this.groups.forEach(g => { if (mem.groupExpanded[g.name] !== undefined)
                        g.expanded = mem.groupExpanded[g.name]; });
                }
                if (mem.panelScrollTop > 0) {
                    setTimeout(() => { var _a; if ((_a = this.listRef) === null || _a === void 0 ? void 0 : _a.nativeElement)
                        this.listRef.nativeElement.scrollTop = mem.panelScrollTop; }, 50);
                }
                return;
            }
        }
        const saved = this.svc.getPanelPosition();
        if (saved.x !== 20 || saved.y !== 60) {
            this.panelX = Math.max(0, saved.x);
            this.panelY = Math.max(0, saved.y);
        }
        setTimeout(() => {
            var _a, _b;
            const hostEl = (_b = (_a = this.terminalRef) === null || _a === void 0 ? void 0 : _a.element) === null || _b === void 0 ? void 0 : _b.nativeElement;
            if (hostEl) {
                const panelEl = hostEl.querySelector('.qc-panel');
                const ph = (panelEl === null || panelEl === void 0 ? void 0 : panelEl.offsetHeight) || 200;
                const pw = (panelEl === null || panelEl === void 0 ? void 0 : panelEl.offsetWidth) || 320;
                this.panelX = Math.max(0, Math.min(this.panelX, Math.max(0, hostEl.clientWidth - pw - 4)));
                this.panelY = Math.max(0, Math.min(this.panelY, Math.max(0, hostEl.clientHeight - ph - 4)));
            }
        }, 0);
    }
    savePosMemory() {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (!this.profileId && this.terminalRef) {
            try {
                const ssh = (_d = (_b = (_a = this.terminalRef) === null || _a === void 0 ? void 0 : _a.sshSession) !== null && _b !== void 0 ? _b : (_c = this.terminalRef) === null || _c === void 0 ? void 0 : _c._session) !== null && _d !== void 0 ? _d : null;
                if ((_f = (_e = this.terminalRef) === null || _e === void 0 ? void 0 : _e.profile) === null || _f === void 0 ? void 0 : _f.id)
                    this.profileId = this.terminalRef.profile.id;
                else if (ssh === null || ssh === void 0 ? void 0 : ssh.host)
                    this.profileId = 'ssh:' + ssh.host;
            }
            catch ( /* ignore */_j) { /* ignore */ }
        }
        if (this.posMemoryOn && this.profileId) {
            const scrollTop = ((_h = (_g = this.listRef) === null || _g === void 0 ? void 0 : _g.nativeElement) === null || _h === void 0 ? void 0 : _h.scrollTop) || 0;
            const groupExp = {};
            this.groups.forEach(g => { groupExp[g.name] = g.expanded; });
            this.svc.savePositionMemory(this.profileId, {
                panelScrollTop: scrollTop > 0 ? scrollTop : undefined,
                filterGroup: this.filterGroup, groupExpanded: groupExp,
            });
        }
    }
    togglePosMemory() {
        var _a, _b;
        if (!this.profileId)
            return;
        this.posMemoryOn = this.svc.togglePositionMemory(this.profileId);
        if (this.posMemoryOn) {
            const groupExp = {};
            this.groups.forEach(g => { groupExp[g.name] = g.expanded; });
            this.svc.savePositionMemory(this.profileId, {
                entryX: 0, entryY: 0, panelX: this.panelX, panelY: this.panelY,
                panelScrollTop: ((_b = (_a = this.listRef) === null || _a === void 0 ? void 0 : _a.nativeElement) === null || _b === void 0 ? void 0 : _b.scrollTop) || 0,
                filterGroup: this.filterGroup, groupExpanded: groupExp,
            });
        }
    }
    doClose() {
        if (!this.profileId)
            this.initTerminalInfo();
        this.savePosMemory();
        if (this.onClose)
            this.onClose();
    }
    noBubble(event) { event.stopPropagation(); }
};
__decorate([
    (0,_angular_core__WEBPACK_IMPORTED_MODULE_0__.ViewChild)('listRef'),
    __metadata("design:type", _angular_core__WEBPACK_IMPORTED_MODULE_0__.ElementRef)
], QuickCommandFloatingPanel.prototype, "listRef", void 0);
QuickCommandFloatingPanel = __decorate([
    (0,_angular_core__WEBPACK_IMPORTED_MODULE_0__.Component)({
        selector: 'qc-floating-panel',
        template: `
    <!-- ====== 浮动面板主体 ====== -->
    <div class="qc-panel"
      [class.minimized]="minimized"
      [class.resizing]="resizing !== null"
      [style.left.px]="panelX"
      [style.top.px]="panelY"
      [style.width.px]="panelWidth"
      [style.height.px]="panelHeight || null"
      [style.max-height.px]="panelHeight ? null : 420"
      (mousedown)="noBubble($event)">

      <!-- 玻璃高光层 -->
      <div class="qc-glass-shine"></div>

      <!-- 标题栏 -->
      <div class="qc-titlebar" (mousedown)="startDrag($event)">
        <span class="qc-title-dot"></span>
        <span class="qc-title">{{ i18n.t('app.title') }}</span>
        <span class="qc-ssh-badge" *ngIf="sshHost">{{ sshHost }}</span>
        <div class="qc-title-spacer"></div>
        <span class="qc-title-btn qc-title-btn-mem"
              [title]="posMemoryOn ? i18n.t('panel.memory_on') : i18n.t('panel.memory_off')"
              [class.active]="posMemoryOn"
              (click)="togglePosMemory(); $event.stopPropagation()">&#x2605;</span>
        <span class="qc-title-btn qc-title-btn-close"
              [title]="i18n.t('panel.close')"
              (click)="doClose(); $event.stopPropagation()">&#x2715;</span>
      </div>

      <ng-container *ngIf="!minimized">
        <!-- 搜索栏 -->
        <div class="qc-search">
          <!-- 分组筛选触发器 -->
          <div class="qc-filter-dropdown" [class.open]="showGroupDropdown">
            <div class="qc-filter-trigger" #filterTrigger (click)="toggleFilterDropdown(filterTrigger); $event.stopPropagation()">
              <span class="qc-filter-label">{{ getFilterGroupLabel() }}</span>
              <span class="qc-filter-clear-btn" *ngIf="filterGroup" (click)="filterGroup = ''; onSearch(); $event.stopPropagation()" [title]="i18n.t('app.all_groups')">&#x2715;</span>
              <span class="qc-filter-arrow">{{ showGroupDropdown ? '&#x25B2;' : '&#x25BC;' }}</span>
            </div>
          </div>
          <div class="qc-search-input-wrap">
            <input class="qc-search-input" type="text"
              [placeholder]="i18n.t('app.search')"
              [(ngModel)]="searchText"
              (input)="onSearch()"
              (keydown.enter)="executeFirst()"
              (keydown.escape)="doClose()">
            <span class="qc-search-clear" *ngIf="searchText" (click)="searchText=''; onSearch()">&#x2715;</span>
          </div>
        </div>

        <!-- 快捷命令栏 -->
        <div class="qc-quick-bar" *ngIf="pinnedCommands.length > 0" (wheel)="onQuickBarWheel($event)">
          <div class="qc-quick-cmd" *ngFor="let pcmd of pinnedCommands"
            (click)="executeCommand(pcmd)" [title]="pcmd.text">
            <span class="qc-quick-icon">&#x2691;</span>
            <span class="qc-quick-name">{{ pcmd.name }}</span>
          </div>
        </div>

        <!-- 命令列表 -->
        <div class="qc-list" #listRef>
          <ng-container *ngFor="let group of displayGroups; let gi = index">
            <!-- 分组头 -->
            <div class="qc-group-header"
              (click)="toggleGroup(group.name)"
              dragover="event.preventDefault()"
              (drop)="onDropToGroup($event, group.name)"
              (dragleave)="onDragLeave($event)">
              <span class="qc-group-arrow">{{ group.expanded ? '&#x25BC;' : '&#x25B6;' }}</span>
              <span class="qc-group-icon">{{ group.expanded ? '&#x1F4C2;' : '&#x1F4C1;' }}</span>
              <span class="qc-group-name">{{ group.name || i18n.t('app.ungrouped') }}</span>
              <span class="qc-group-count">{{ getGroupCommands(group.name).length }}</span>
              <div class="qc-group-actions">
                <span class="qc-group-act" (click)="addCommandToGroup(group.name); $event.stopPropagation()" [title]="i18n.t('panel.add')">+</span>
                <span class="qc-group-act" (click)="showGroupRenameDialog(group.name); $event.stopPropagation()" [title]="i18n.t('group.rename')">&#x270E;</span>
                <span class="qc-group-act qc-group-act-del" (click)="deleteGroup(group.name); $event.stopPropagation()" [title]="i18n.t('group.delete')">&#x2212;</span>
              </div>
            </div>

            <!-- 命令行 -->
            <div *ngIf="group.expanded" class="qc-cmd-group-body"
              (dragover)="onListDragOver($event)"
              (dragleave)="onListDragLeave($event)"
              (drop)="onListDrop($event, group.name)">
              <div *ngFor="let cmd of getGroupCommands(group.name)" class="qc-cmd-row"
                (click)="executeCommand(cmd)"
                (dblclick)="editCommand(cmd)"
                [class.highlighted]="highlightedId === cmd.id"
                (dragover)="onDragOver($event)"
                (dragleave)="onDragLeave($event)"
                (drop)="onDrop($event, cmd)">
                <span class="qc-cmd-drag" draggable="true"
                  (dragstart)="onDragStart($event, cmd)"
                  (dragend)="onDragEnd($event)" [title]="i18n.t('panel.drag_reorder')">&#x2261;</span>
                <div class="qc-cmd-body">
                  <span class="qc-cmd-name">{{ cmd.name }}</span>
                  <span class="qc-cmd-preview" [title]="cmd.text">{{ getPreview(cmd) }}</span>
                </div>
                <span class="qc-cmd-badge" *ngIf="cmd.params && cmd.params.length > 0" [title]="i18n.t('panel.param_hint')">{{ getParamBadge(cmd) }}</span>
                <span class="qc-cmd-shortcut-badge" *ngIf="cmd.shortcut">{{ cmd.shortcut }}</span>
                <div class="qc-cmd-actions">
                  <span class="qc-cmd-act" (click)="copyCommandText(cmd); $event.stopPropagation()" [title]="i18n.t('panel.copy')">&#x2750;</span>
                  <span class="qc-cmd-act" (click)="editCommand(cmd); $event.stopPropagation()" [title]="i18n.t('panel.edit')">&#x270E;</span>
                  <span class="qc-cmd-act" (click)="sendToLine(cmd); $event.stopPropagation()" [title]="i18n.t('panel.send_to_line')">&#x21E7;</span>
                  <span class="qc-cmd-act qc-cmd-act-run" (click)="executeAlways(cmd); $event.stopPropagation()" [title]="i18n.t('panel.send_and_exec')">&#x23CE;</span>
                  <span class="qc-cmd-act qc-cmd-act-del" (click)="deleteCommand(cmd); $event.stopPropagation()" [title]="i18n.t('panel.delete')">&#x2715;</span>
                </div>
              </div>
              <div class="qc-drop-end" [class.drag-over]="listDropOver"></div>
            </div>
          </ng-container>

          <div class="qc-empty" *ngIf="filteredCommands.length === 0 && searchText">
            <span class="qc-empty-icon">&#x1F50D;</span>
            <span>{{ i18n.t('app.noresults') }}</span>
          </div>
          <div class="qc-empty" *ngIf="filteredCommands.length === 0 && !searchText">
            <span class="qc-empty-icon">&#x2328;</span>
            <span>{{ i18n.t('panel.hint.search') }}</span>
          </div>
        </div>

        <!-- 底部栏 -->
        <div class="qc-footer">
          <span class="qc-footer-btn qc-footer-btn-primary" (click)="addCommand()">+ {{ i18n.t('panel.add') }}</span>
          <span class="qc-footer-btn" (click)="addNewGroup()">+ {{ i18n.t('group.add') }}</span>
          <span class="qc-footer-count" *ngIf="selectedCount > 0">{{ selectedCount }} cmd</span>
        </div>
      </ng-container>

      <!-- 调整大小手柄 -->
      <div class="qc-rsz qc-rsz-e"  (mousedown)="startResize($event, 'e')"></div>
      <div class="qc-rsz qc-rsz-w"  (mousedown)="startResize($event, 'w')"></div>
      <div class="qc-rsz qc-rsz-s"  (mousedown)="startResize($event, 's')"></div>
      <div class="qc-rsz qc-rsz-n"  (mousedown)="startResize($event, 'n')"></div>
      <div class="qc-rsz qc-rsz-se" (mousedown)="startResize($event, 'se')"></div>
      <div class="qc-rsz qc-rsz-sw" (mousedown)="startResize($event, 'sw')"></div>
      <div class="qc-rsz qc-rsz-ne" (mousedown)="startResize($event, 'ne')"></div>
      <div class="qc-rsz qc-rsz-nw" (mousedown)="startResize($event, 'nw')"></div>
    </div>

    <!-- ====== 分组下拉（在面板外部，使用 fixed 定位，避免被面板 overflow/stacking 裁剪） ====== -->
    <div class="qc-filter-backdrop" *ngIf="showGroupDropdown" (click)="showGroupDropdown = false; $event.stopPropagation()" (mousedown)="$event.stopPropagation()"></div>
    <div class="qc-filter-menu" *ngIf="showGroupDropdown" (mousedown)="$event.stopPropagation()"
      [style.left.px]="filterMenuX" [style.top.px]="filterMenuY">
      <div class="qc-filter-option" [class.active]="filterGroup === ''"
        (click)="filterGroup = ''; showGroupDropdown = false; onSearch()">
        <span class="qc-filter-opt-icon">&#x1F3F7;</span> {{ i18n.t('app.all_groups') }}
      </div>
      <div class="qc-filter-opt-divider"></div>
      <div class="qc-filter-option" *ngFor="let g of allGroups"
        [class.active]="filterGroup === (g.name || '__ungrouped__')"
        (click)="filterGroup = (g.name || '__ungrouped__'); showGroupDropdown = false; onSearch()">
        <span class="qc-filter-opt-icon">{{ (g.name ? '&#x1F4C1;' : '&#x1F4C4;') }}</span> {{ g.name || i18n.t('app.ungrouped') }}
      </div>
    </div>

    <!-- ====== 编辑命令弹窗 ====== -->
    <div class="qc-overlay" *ngIf="showEditModal" (click)="closeEditModal()"></div>
    <div class="qc-modal" *ngIf="showEditModal" (click)="$event.stopPropagation()">
      <div class="qc-modal-header">
        <span class="qc-modal-title">{{ editCmd?.id ? i18n.t('settings.edit_cmd') : i18n.t('panel.add') }}</span>
      </div>
      <div class="qc-modal-body">
        <div class="qc-field">
          <label class="qc-field-label">{{ i18n.t('settings.name') }}</label>
          <input class="qc-field-input" type="text" [(ngModel)]="editCmd.name" (keydown.enter)="saveEditCmd()" placeholder="e.g. git status">
        </div>

        <label class="qc-field-label" style="margin-bottom:6px;">{{ i18n.t('settings.text') }}</label>
        <div class="qc-step-row" *ngFor="let step of editCmdSteps; let i = index"
          (dragover)="onStepDragOver($event, i)"
          (dragleave)="onStepDragLeave($event)"
          (drop)="onStepDrop($event, i)"
          [class.dragging]="stepDragIdx === i">
          <span class="qc-step-drag" draggable="true"
            (dragstart)="onStepDragStart($event, i)"
            (dragend)="onStepDragEnd($event)" [title]="i18n.t('panel.drag_reorder')">&#x2261;</span>
          <span class="qc-step-type"
            (click)="step.type = (step.type === 'break' ? 'command' : 'break'); $event.stopPropagation()"
            [title]="step.type === 'break' ? i18n.t('settings.step_type_cmd') : i18n.t('settings.step_type_break')"
            [class.is-break]="step.type === 'break'">{{ step.type === 'break' ? '&#x26A0;' : '&#x25B6;' }}</span>
          <input class="qc-step-delay" type="number" min="0" max="60" step="0.2"
            [(ngModel)]="step.delaySeconds" [placeholder]="i18n.t('settings.delay_short')"
            [title]="i18n.t('settings.delay_hint')">
          <textarea class="qc-step-input" [(ngModel)]="step.text" rows="1"
            *ngIf="step.type !== 'break'" [placeholder]="(i18n.t('settings.step_placeholder') + ' ' + (i+1))"
            (input)="autoGrow($event)" (keydown.enter)="saveEditCmd()"></textarea>
          <span class="qc-step-break-label" *ngIf="step.type === 'break'">{{ i18n.t('settings.send_ctrlc') }}</span>
          <span class="qc-step-del" (click)="removeStep(i)">&#x2715;</span>
        </div>
        <div class="qc-step-actions">
          <span class="qc-step-add" (click)="addStep()">+ {{ i18n.t('settings.add_step') }}</span>
          <span class="qc-step-add qc-step-add-break" (click)="addBreakStep()">+ {{ i18n.t('settings.add_break') }}</span>
        </div>

        <div class="qc-field">
          <label class="qc-field-label">{{ i18n.t('settings.group') }}</label>
          <div class="qc-filter-dropdown" [class.open]="showEditGroupDropdown">
            <div class="qc-filter-trigger" #editGroupTrigger (click)="toggleEditGroupDropdown(editGroupTrigger); $event.stopPropagation()">
              <span class="qc-filter-label">{{ editCmd.group || i18n.t('app.ungrouped') }}</span>
              <span class="qc-filter-arrow">{{ showEditGroupDropdown ? '&#x25B2;' : '&#x25BC;' }}</span>
            </div>
          </div>
        </div>
        <div class="qc-check-row">
          <label class="qc-check"><input type="checkbox" [(ngModel)]="editCmd.appendCR"><span>{{ i18n.t('settings.append_cr') }}</span></label>
          <label class="qc-check"><input type="checkbox" [(ngModel)]="editCmd.pinned"><span>{{ i18n.t('settings.pinned') }}</span></label>
        </div>
        <div class="qc-usage-row" *ngIf="editCmd?.id && editCmd?.usageCount !== undefined">
          <span class="qc-usage-label">{{ i18n.t('settings.usage_count') }}: <strong>{{ editCmd.usageCount || 0 }}</strong></span>
          <span class="qc-usage-reset" (click)="onResetUsage()">{{ i18n.t('settings.reset') }}</span>
        </div>
      </div>
      <div class="qc-modal-footer">
        <button class="qc-btn qc-btn-ghost" (click)="closeEditModal()">{{ i18n.t('settings.cancel') }}</button>
        <button class="qc-btn qc-btn-primary" (click)="saveEditCmd()">{{ i18n.t('settings.save') }}</button>
      </div>
    </div>

    <!-- 编辑弹窗 — 分组下拉菜单 -->
    <div class="qc-filter-backdrop" *ngIf="showEditGroupDropdown" (click)="showEditGroupDropdown = false; $event.stopPropagation()" (mousedown)="$event.stopPropagation()"></div>
    <div class="qc-filter-menu" *ngIf="showEditGroupDropdown" (mousedown)="$event.stopPropagation()"
      [style.left.px]="editGroupMenuX" [style.top.px]="editGroupMenuY">
      <div class="qc-filter-option" [class.active]="!editCmd.group"
        (click)="editCmd.group = ''; showEditGroupDropdown = false">
        <span class="qc-filter-opt-icon">&#x1F4C4;</span> {{ i18n.t('app.ungrouped') }}
      </div>
      <div class="qc-filter-opt-divider" *ngIf="allGroups.length > 0"></div>
      <div class="qc-filter-option" *ngFor="let g of allGroups"
        [class.active]="editCmd.group === g.name"
        (click)="editCmd.group = g.name; showEditGroupDropdown = false">
        <span class="qc-filter-opt-icon">&#x1F4C1;</span> {{ g.name }}
      </div>
    </div>

    <!-- ====== 参数输入弹窗 ====== -->
    <div class="qc-overlay" *ngIf="showParamModal" (click)="closeParamModal()"></div>
    <div class="qc-modal" *ngIf="showParamModal" (click)="$event.stopPropagation()">
      <div class="qc-modal-header">
        <span class="qc-modal-title">{{ paramModalCmd?.name || i18n.t('panel.param_hint') }}</span>
      </div>
      <div class="qc-modal-body">
        <div class="qc-field" *ngFor="let p of paramModalParams">
          <label class="qc-field-label">{{ p }}</label>
          <input class="qc-field-input" type="text" [(ngModel)]="paramModalValues[p]"
            (keydown.enter)="confirmParamModal()" [placeholder]="i18n.t('panel.param_hint') + ': ' + p" autofocus>
        </div>
      </div>
      <div class="qc-modal-footer">
        <button class="qc-btn qc-btn-ghost" (click)="closeParamModal()">{{ i18n.t('settings.cancel') }}</button>
        <button class="qc-btn qc-btn-primary" (click)="confirmParamModal()">{{ i18n.t('settings.ok') }}</button>
      </div>
    </div>

    <!-- ====== 分组编辑弹窗 ====== -->
    <div class="qc-overlay" *ngIf="showGroupRename" (click)="closeGroupRename()"></div>
    <div class="qc-modal qc-modal-sm" *ngIf="showGroupRename" (click)="$event.stopPropagation()">
      <div class="qc-modal-header">
        <span class="qc-modal-title">{{ groupRenameIsNew ? i18n.t('group.add') : i18n.t('group.edit') }}</span>
      </div>
      <div class="qc-modal-body">
        <div class="qc-field">
          <label class="qc-field-label">{{ i18n.t('group.name') }}</label>
          <input class="qc-field-input" type="text" [(ngModel)]="groupRenameValue"
            (keydown.enter)="confirmGroupRename()" [placeholder]="i18n.t('group.name')" autofocus>
        </div>
        <div class="qc-field">
          <label class="qc-field-label">{{ i18n.t('group.order') }}</label>
          <input class="qc-field-input" type="number" min="0" step="1" [(ngModel)]="groupRenameOrder"
            (keydown.enter)="confirmGroupRename()" placeholder="0">
        </div>
      </div>
      <div class="qc-modal-footer">
        <button class="qc-btn qc-btn-ghost" (click)="closeGroupRename()">{{ i18n.t('settings.cancel') }}</button>
        <button class="qc-btn qc-btn-primary" (click)="confirmGroupRename()">{{ i18n.t('settings.ok') }}</button>
      </div>
    </div>

    <!-- ====== 多步命令提示弹窗 ====== -->
    <div class="qc-overlay" *ngIf="showMultiStepHint" (click)="cancelMultiStepHint()"></div>
    <div class="qc-modal qc-modal-sm" *ngIf="showMultiStepHint" (click)="$event.stopPropagation()">
      <div class="qc-modal-header">
        <span class="qc-modal-title">{{ i18n.t('panel.multi_step_title') }}</span>
      </div>
      <div class="qc-modal-body">
        <p class="qc-modal-text">{{ i18n.t('panel.multi_step_hint', { count: multiStepCount }) }}</p>
      </div>
      <div class="qc-modal-footer">
        <button class="qc-btn qc-btn-ghost" (click)="cancelMultiStepHint()">{{ i18n.t('settings.cancel') }}</button>
        <button class="qc-btn qc-btn-primary" (click)="confirmMultiStepJoin()">{{ i18n.t('settings.ok') }}</button>
      </div>
    </div>
  `,
        styles: [`
    /* ========================================
       CSS 自定义属性（继承自 :root 的 --qc-*）
       ======================================== */
    :host {
      display: contents;
      --_bg: var(--qc-bg, rgba(22,22,28,0.72));
      --_bg-rgb: var(--qc-bg-rgb, 22,22,28);
      --_text: var(--qc-text, #e8e8e8);
      --_text-secondary: var(--qc-text-secondary, #b0b0b0);
      --_text-muted: var(--qc-text-muted, #7a7a8a);
      --_primary: var(--qc-primary, #5b8def);
      --_primary-rgb: var(--qc-primary-rgb, 91,141,239);
      --_border: var(--qc-border, rgba(255,255,255,0.10));
      --_surface: var(--qc-surface, rgba(255,255,255,0.06));
      --_surface-rgb: var(--qc-surface-rgb, 255,255,255);
      --_input-bg: var(--qc-input-bg, rgba(255,255,255,0.08));
      --_hover: var(--qc-hover, rgba(255,255,255,0.08));
      --_group-name: var(--qc-group-name, var(--_text-secondary));
      --_shadow: var(--qc-shadow, 0 8px 40px rgba(0,0,0,0.42));
      --_blur: var(--qc-blur, 24px);
      --_saturate: var(--qc-saturate, 160%);
      --_warning: #fab387;
      --_danger: #f38ba8;
    }

    /* ========================================
       面板主体 — 毛玻璃核心
       ======================================== */
    .qc-panel {
      position: absolute;
      z-index: 99999;
      width: 340px;
      background: var(--_bg);
      backdrop-filter: blur(var(--_blur)) saturate(var(--_saturate));
      -webkit-backdrop-filter: blur(var(--_blur)) saturate(var(--_saturate));
      border: 1px solid var(--_border);
      border-radius: 14px;
      box-shadow: var(--_shadow);
      display: flex;
      flex-direction: column;
      user-select: none;
      font-size: var(--qc-font-size, 14px);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', system-ui, sans-serif;
      overflow: hidden;
      transition: box-shadow 0.25s ease;
    }
    .qc-panel:hover {
      box-shadow: var(--_shadow), 0 0 0 1px rgba(255,255,255,0.04) inset;
    }
    .qc-panel.minimized {
      width: auto !important;
      height: auto !important;
      border-radius: 10px;
      box-shadow: var(--_shadow);
    }

    /* 玻璃高光 */
    .qc-glass-shine {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      border-radius: inherit;
      background:
        radial-gradient(160% 120% at 0% 0%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 50%, transparent 100%),
        linear-gradient(170deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 40%, rgba(255,255,255,0.03) 100%);
    }

    /* ========================================
       标题栏
       ======================================== */
    .qc-titlebar {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 12px;
      cursor: move;
      flex-shrink: 0;
      border-bottom: 1px solid var(--_border);
      background: rgba(255,255,255,0.03);
    }
    .qc-title-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--_primary);
      flex-shrink: 0;
      box-shadow: 0 0 6px rgba(var(--_primary-rgb), 0.4);
    }
    .qc-title {
      font-weight: 600;
      font-size: 0.95em;
      color: var(--_text);
      letter-spacing: 0.02em;
    }
    .qc-ssh-badge {
      margin-left: 2px;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.78em;
      font-weight: 500;
      color: var(--_primary);
      background: rgba(var(--_primary-rgb), 0.12);
      border: 1px solid rgba(var(--_primary-rgb), 0.2);
    }
    .qc-title-spacer { flex: 1; }
    .qc-title-btn {
      width: 26px; height: 26px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 50%;
      font-size: 13px;
      cursor: pointer;
      color: var(--_text-muted);
      transition: all 0.15s ease;
      flex-shrink: 0;
    }
    .qc-title-btn:hover { background: var(--_hover); color: var(--_text); }
    .qc-title-btn-mem { font-size: 14px; }
    .qc-title-btn-mem.active { color: #f9e2af; }
    .qc-title-btn-mem:hover { color: #f9e2af; }
    .qc-title-btn-close:hover { background: rgba(243,139,168,0.2); color: var(--_danger); }

    /* ========================================
       搜索栏
       ======================================== */
    .qc-search {
      position: relative; z-index: 1;
      display: flex; gap: 8px;
      padding: 10px 12px;
      flex-shrink: 0;
    }
    /* 自定义分组下拉 - 触发器 */
    .qc-filter-dropdown { flex-shrink: 0; }
    .qc-filter-trigger {
      display: flex; align-items: center; gap: 6px;
      padding: 7px 10px 7px 12px;
      border-radius: 10px; cursor: pointer;
      background: var(--_input-bg);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      border: 1px solid var(--_border);
      color: var(--_text-secondary);
      font-size: 0.85em; font-weight: 500;
      transition: all 0.18s ease;
      white-space: nowrap; user-select: none;
      min-width: 90px;
    }
    .qc-filter-trigger:hover { border-color: rgba(var(--_primary-rgb), 0.5); background: var(--_hover); }
    .qc-filter-dropdown.open .qc-filter-trigger { border-color: var(--_primary); box-shadow: 0 0 0 3px rgba(var(--_primary-rgb), 0.12); }
    .qc-filter-label { flex: 1; overflow: hidden; text-overflow: ellipsis; }
    .qc-filter-arrow { font-size: 0.65em; color: var(--_text-muted); transition: transform 0.18s; flex-shrink: 0; }

    /* 下拉遮罩和菜单 — fixed 定位在面板外部，不受面板 overflow/stacking 影响 */
    .qc-filter-backdrop { position: fixed; inset: 0; z-index: 100000; }
    .qc-filter-menu {
      position: fixed; z-index: 100001;
      min-width: 150px; max-width: 240px; max-height: 220px;
      overflow-y: auto; overflow-x: hidden;
      background: rgb(var(--_bg-rgb, 22,22,28));
      border: 1px solid var(--_border);
      border-radius: 12px;
      box-shadow: 0 16px 48px rgba(0,0,0,0.55);
      padding: 6px;
    }
    .qc-filter-option {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 10px; border-radius: 8px;
      font-size: 0.84em; color: var(--_text-secondary);
      cursor: pointer; transition: all 0.1s;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .qc-filter-option:hover { background: var(--_hover); color: var(--_text); }
    .qc-filter-option.active { background: rgba(var(--_primary-rgb), 0.12); color: var(--_primary); font-weight: 600; }
    .qc-filter-opt-icon { font-size: 0.85em; flex-shrink: 0; opacity: 0.6; }
    .qc-filter-opt-divider { height: 1px; margin: 4px 8px; background: var(--_border); }
    .qc-filter-clear-btn {
      width: 18px; height: 18px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 50%; cursor: pointer;
      font-size: 0.65em; color: var(--_text-muted);
      background: rgba(255,255,255,0.06);
      transition: all 0.12s; flex-shrink: 0;
    }
    .qc-filter-clear-btn:hover { background: rgba(243,139,168,0.2); color: var(--_danger); }
    .qc-search-input-wrap {
      flex: 1; position: relative; display: flex; align-items: center;
    }
    .qc-search-input {
      width: 100%; padding: 7px 32px 7px 12px;
      border-radius: 10px; box-sizing: border-box;
      background: var(--_input-bg);
      border: 1px solid var(--_border);
      color: var(--_text);
      font-size: 0.9em; outline: none;
      transition: border-color 0.15s;
    }
    .qc-search-input::placeholder { color: var(--_text-muted); }
    .qc-search-input:focus { border-color: var(--_primary); }
    .qc-search-clear {
      position: absolute; right: 8px;
      width: 20px; height: 20px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 50%;
      font-size: 11px; cursor: pointer;
      color: var(--_text-muted);
      background: rgba(255,255,255,0.06);
      transition: all 0.12s;
    }
    .qc-search-clear:hover { background: rgba(255,255,255,0.14); color: var(--_text); }

    /* ========================================
       快捷命令栏
       ======================================== */
    .qc-quick-bar {
      position: relative; z-index: 1;
      display: flex; gap: 6px;
      padding: 0 12px 10px;
      flex-shrink: 0;
      overflow-x: auto;
    }
    .qc-quick-cmd {
      display: flex; align-items: center; gap: 4px;
      flex-shrink: 0;
      padding: 5px 12px;
      border-radius: 20px;
      background: rgba(var(--_primary-rgb), 0.10);
      border: 1px solid rgba(var(--_primary-rgb), 0.18);
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s;
    }
    .qc-quick-cmd:hover {
      background: rgba(var(--_primary-rgb), 0.18);
      border-color: rgba(var(--_primary-rgb), 0.32);
      transform: translateY(-1px);
    }
    .qc-quick-icon { font-size: 0.75em; color: var(--_primary); flex-shrink: 0; }
    .qc-quick-name {
      font-size: 0.82em; font-weight: 500;
      color: var(--_text);
      max-width: 120px; overflow: hidden; text-overflow: ellipsis;
    }

    /* ========================================
       命令列表 & 分组头
       ======================================== */
    .qc-list {
      position: relative; z-index: 1;
      flex: 1; overflow-y: auto; overflow-x: hidden;
      padding: 0 8px; min-width: 0;
    }
    .qc-group-header {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 10px;
      margin: 2px 0;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.12s;
      position: relative;
      z-index: 1;
    }
    .qc-group-header:hover { background: var(--_hover); }
    .qc-group-header.drag-over {
      outline: 2px solid var(--_primary);
      outline-offset: -1px;
    }
    .qc-group-arrow {
      font-size: 0.65em; color: var(--_text-muted);
      width: 14px; text-align: center; flex-shrink: 0;
      transition: transform 0.15s;
    }
    .qc-group-icon { font-size: 0.8em; flex-shrink: 0; }
    .qc-group-name {
      font-weight: 600; font-size: 0.88em;
      color: var(--_group-name);
      flex: 1; min-width: 0;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .qc-group-count {
      font-size: 0.72em; font-weight: 600;
      color: var(--_text-muted);
      background: var(--_surface);
      padding: 2px 7px; border-radius: 10px;
      flex-shrink: 0;
    }
    .qc-group-actions {
      display: flex; gap: 2px; flex-shrink: 0;
      opacity: 0; transition: opacity 0.12s;
    }
    .qc-group-header:hover .qc-group-actions { opacity: 1; }
    .qc-group-act {
      width: 24px; height: 24px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 6px;
      font-size: 0.9em; cursor: pointer;
      color: var(--_text-muted);
      transition: all 0.12s;
    }
    .qc-group-act:hover { background: var(--_hover); color: var(--_text); }
    .qc-group-act-del:hover { background: rgba(243,139,168,0.15); color: var(--_danger); }

    /* ========================================
       命令行
       ======================================== */
    .qc-cmd-group-body {
      position: relative; z-index: 1;
      padding: 2px 0 2px 12px;
      border-left: 1px solid var(--_border);
      margin-left: 12px;
    }
    .qc-cmd-row {
      display: flex; align-items: center; gap: 6px;
      padding: 7px 10px; margin: 2px 0;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.12s;
      background: transparent;
      border: 1px solid transparent;
    }
    .qc-cmd-row:hover, .qc-cmd-row.highlighted {
      background: var(--_surface);
      border-color: var(--_border);
    }
    .qc-cmd-row.drag-over { border-top: 2px solid var(--_primary); }
    .qc-cmd-row.drag-over-bottom { border-bottom: 2px solid var(--_primary); }
    .qc-cmd-row.dragging { opacity: 0.35; }
    .qc-cmd-drag {
      font-size: 15px; color: var(--_text-muted); cursor: grab;
      flex-shrink: 0; width: 16px; text-align: center;
      user-select: none; letter-spacing: -2px;
    }
    .qc-cmd-drag:active { cursor: grabbing; }
    .qc-cmd-body { flex: 1; min-width: 0; }
    .qc-cmd-name {
      display: block; font-size: 0.88em; font-weight: 500;
      color: var(--_text); line-height: 1.4;
    }
    .qc-cmd-preview {
      display: block; font-size: 0.74em; font-family: 'SF Mono', 'Cascadia Code', 'JetBrains Mono', 'Fira Code', monospace;
      color: var(--_text-muted);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      margin-top: 1px;
    }
    .qc-cmd-badge {
      font-size: 0.7em; font-weight: 600; padding: 2px 6px;
      border-radius: 6px;
      background: rgba(250,179,135,0.18);
      color: var(--_warning);
      flex-shrink: 0; letter-spacing: 0.02em;
    }
    .qc-cmd-shortcut-badge {
      font-size: 0.7em; padding: 2px 6px; border-radius: 6px;
      background: var(--_surface); color: var(--_text-muted);
      font-family: monospace; flex-shrink: 0;
    }
    .qc-cmd-actions {
      display: flex; gap: 1px; flex-shrink: 0;
      opacity: 0; transition: opacity 0.12s;
    }
    .qc-cmd-row:hover .qc-cmd-actions { opacity: 1; }
    .qc-cmd-act {
      width: 26px; height: 26px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 6px;
      font-size: 0.85em; cursor: pointer;
      color: var(--_text-muted);
      transition: all 0.12s;
    }
    .qc-cmd-act:hover { background: var(--_hover); color: var(--_text); }
    .qc-cmd-act.active { color: var(--_primary); opacity: 1 !important; }
    .qc-cmd-act-run { font-size: 1.05em; }
    .qc-cmd-act-run:hover { background: rgba(var(--_primary-rgb), 0.14); color: var(--_primary); }
    .qc-cmd-act-del:hover { background: rgba(243,139,168,0.15); color: var(--_danger); }
    .qc-drop-end {
      height: 0; transition: height 0.12s;
      border-radius: 6px; margin: 2px 10px;
    }
    .qc-drop-end.drag-over { height: 4px; background: var(--_primary); }

    /* ========================================
       空状态
       ======================================== */
    .qc-empty {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 32px 20px; text-align: center;
    }
    .qc-empty-icon { font-size: 28px; opacity: 0.5; }
    .qc-empty span:last-child {
      font-size: 0.88em; color: var(--_text-muted);
      line-height: 1.5;
    }

    /* ========================================
       底部栏
       ======================================== */
    .qc-footer {
      position: relative; z-index: 1;
      display: flex; align-items: center; gap: 10px;
      padding: 9px 12px;
      border-top: 1px solid var(--_border);
      flex-shrink: 0;
    }
    .qc-footer-btn {
      font-size: 0.82em; font-weight: 500;
      cursor: pointer;
      padding: 5px 10px; border-radius: 8px;
      color: var(--_text-muted);
      transition: all 0.12s;
    }
    .qc-footer-btn:hover { background: var(--_hover); color: var(--_text); }
    .qc-footer-btn-primary { color: var(--_primary); }
    .qc-footer-btn-primary:hover { background: rgba(var(--_primary-rgb), 0.1); }
    .qc-footer-count {
      margin-left: auto;
      font-size: 0.78em; font-weight: 500;
      color: var(--_text-muted);
    }

    /* ========================================
       调整大小手柄
       ======================================== */
    .qc-rsz { position: absolute; z-index: 2; }
    .qc-rsz-e, .qc-rsz-w { top: 4px; bottom: 4px; width: 8px; cursor: ew-resize; }
    .qc-rsz-s, .qc-rsz-n { left: 4px; right: 4px; height: 8px; cursor: ns-resize; }
    .qc-rsz-e { right: 0; border-radius: 0 14px 14px 0; }
    .qc-rsz-w { left: 0; border-radius: 14px 0 0 14px; }
    .qc-rsz-s { bottom: 0; border-radius: 0 0 14px 14px; }
    .qc-rsz-n { top: 0; border-radius: 14px 14px 0 0; }
    .qc-rsz-se, .qc-rsz-sw, .qc-rsz-ne, .qc-rsz-nw { width: 14px; height: 14px; }
    .qc-rsz-se { right: 0; bottom: 0; cursor: nwse-resize; }
    .qc-rsz-sw { left: 0; bottom: 0; cursor: nesw-resize; }
    .qc-rsz-ne { right: 0; top: 0; cursor: nesw-resize; }
    .qc-rsz-nw { left: 0; top: 0; cursor: nwse-resize; }

    /* ========================================
       弹窗通用
       ======================================== */
    .qc-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 100000;
    }
    .qc-modal {
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: var(--_bg);
      backdrop-filter: blur(calc(var(--_blur) * 1.2)) saturate(var(--_saturate));
      -webkit-backdrop-filter: blur(calc(var(--_blur) * 1.2)) saturate(var(--_saturate));
      border: 1px solid var(--_border);
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      z-index: 100001;
      width: 600px; max-width: 92vw;
      overflow: hidden;
      isolation: isolate;
    }
    .qc-modal-sm { width: 380px; }
    .qc-modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--_border);
      background: rgba(255,255,255,0.02);
    }
    .qc-modal-title {
      font-weight: 600; font-size: 1em;
      color: var(--_text);
    }
    .qc-modal-body {
      padding: 20px;
      max-height: 55vh; overflow-y: auto;
    }
    .qc-modal-text {
      font-size: 0.9em; color: var(--_text-secondary);
      line-height: 1.6; margin: 0;
    }
    .qc-modal-footer {
      display: flex; gap: 8px; justify-content: flex-end;
      padding: 14px 20px;
      border-top: 1px solid var(--_border);
      background: rgba(255,255,255,0.015);
    }

    /* 表单字段 */
    .qc-field { margin-bottom: 14px; }
    .qc-field-label {
      display: block; font-size: 0.78em; font-weight: 600;
      color: var(--_text-muted); margin-bottom: 5px;
      text-transform: uppercase; letter-spacing: 0.04em;
    }
    .qc-field-input {
      width: 100%; padding: 9px 12px; border-radius: 10px;
      box-sizing: border-box;
      background: var(--_input-bg);
      border: 1px solid var(--_border);
      color: var(--_text);
      font-size: 0.92em; outline: none;
      transition: border-color 0.15s;
    }
    .qc-field-input:focus { border-color: var(--_primary); }
    select.qc-field-input {
      cursor: pointer; appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23888'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 30px;
    }
    select.qc-field-input option { color: #000; background: #fff; }

    /* 复选框行 */
    .qc-check-row { display: flex; gap: 18px; margin: 12px 0; }
    .qc-check {
      display: flex; align-items: center; gap: 6px;
      font-size: 0.88em; color: var(--_text-secondary);
      cursor: pointer;
    }
    .qc-check input[type="checkbox"] {
      width: 16px; height: 16px; margin: 0;
      accent-color: var(--_primary); cursor: pointer;
    }

    /* 用量行 */
    .qc-usage-row {
      display: flex; align-items: center; gap: 10px;
      margin-top: 4px; padding: 8px 12px;
      border-radius: 8px; background: var(--_surface);
      font-size: 0.8em; color: var(--_text-muted);
    }
    .qc-usage-label strong { color: var(--_text); font-size: 1.05em; }
    .qc-usage-reset {
      margin-left: auto; cursor: pointer;
      color: var(--_warning); font-size: 0.85em;
      padding: 3px 10px; border-radius: 6px;
      transition: background 0.12s;
    }
    .qc-usage-reset:hover { background: rgba(250,179,135,0.12); }

    /* 按钮 */
    .qc-btn {
      padding: 8px 20px; border-radius: 10px;
      border: 1px solid var(--_border);
      background: var(--_surface);
      color: var(--_text);
      font-size: 0.88em; font-weight: 500;
      cursor: pointer;
      transition: all 0.12s;
    }
    .qc-btn:hover { background: var(--_hover); }
    .qc-btn-primary {
      background: var(--_primary);
      color: #fff;
      border-color: var(--_primary);
      font-weight: 600;
      box-shadow: 0 4px 14px rgba(var(--_primary-rgb), 0.3);
    }
    .qc-btn-primary:hover {
      opacity: 0.9;
      box-shadow: 0 6px 20px rgba(var(--_primary-rgb), 0.4);
      transform: translateY(-1px);
    }
    .qc-btn-ghost {
      background: transparent; border-color: transparent;
      color: var(--_text-muted);
    }
    .qc-btn-ghost:hover { background: var(--_hover); color: var(--_text); }

    /* ========================================
       步骤编辑器
       ======================================== */
    .qc-step-row {
      display: flex; gap: 5px; align-items: center;
      margin-bottom: 4px;
      padding: 6px 8px;
      border-radius: 10px;
      background: var(--_surface);
      border: 1px solid transparent;
      transition: border-color 0.12s;
    }
    .qc-step-row:hover { border-color: var(--_border); }
    .qc-step-row.dragging { opacity: 0.4; }
    .qc-step-row.drag-over { border-top: 2px solid var(--_primary); }
    .qc-step-row.drag-over-bottom { border-bottom: 2px solid var(--_primary); }
    .qc-step-drag {
      font-size: 15px; color: var(--_text-muted); cursor: grab;
      flex-shrink: 0; width: 16px; text-align: center;
      user-select: none;
    }
    .qc-step-drag:active { cursor: grabbing; }
    .qc-step-type {
      font-size: 0.85em; cursor: pointer; flex-shrink: 0;
      width: 26px; height: 26px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 7px;
      color: var(--_primary);
      background: rgba(var(--_primary-rgb), 0.10);
      transition: background 0.12s;
    }
    .qc-step-type.is-break {
      color: #fab387; background: rgba(250,179,135,0.12);
    }
    .qc-step-type:hover { background: rgba(var(--_primary-rgb), 0.18); }
    .qc-step-type.is-break:hover { background: rgba(250,179,135,0.2); }
    .qc-step-input {
      flex: 1; padding: 7px 10px; border-radius: 8px;
      box-sizing: border-box;
      background: var(--_input-bg); border: 1px solid var(--_border);
      color: var(--_text); font-size: 0.88em; outline: none;
      resize: none; overflow: hidden; min-height: 30px;
      field-sizing: content; font-family: monospace;
    }
    .qc-step-input:focus { border-color: var(--_primary); }
    .qc-step-delay {
      width: 60px; padding: 7px 4px; border-radius: 8px;
      box-sizing: border-box; flex-shrink: 0;
      background: var(--_input-bg); border: 1px solid var(--_border);
      color: var(--_text-muted); font-size: 0.78em;
      outline: none; text-align: center;
    }
    .qc-step-delay:focus { border-color: var(--_primary); color: var(--_text); }
    .qc-step-del {
      flex-shrink: 0; cursor: pointer;
      width: 26px; height: 26px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 6px;
      color: var(--_text-muted); font-size: 0.8em;
      transition: all 0.12s;
    }
    .qc-step-del:hover { background: rgba(243,139,168,0.15); color: var(--_danger); }
    .qc-step-break-label {
      flex: 1; font-size: 0.85em; font-weight: 600;
      color: #fab387; padding: 0 4px;
    }
    .qc-step-actions {
      display: flex; gap: 14px; margin-top: 4px; margin-bottom: 8px;
    }
    .qc-step-add {
      font-size: 0.82em; font-weight: 500;
      color: var(--_primary); cursor: pointer;
      padding: 4px 8px; border-radius: 6px;
      transition: background 0.12s;
    }
    .qc-step-add:hover { background: rgba(var(--_primary-rgb), 0.08); }
    .qc-step-add-break { color: #fab387; }
    .qc-step-add-break:hover { background: rgba(250,179,135,0.08); }

    /* ========================================
       滚动条
       ======================================== */
    .qc-list::-webkit-scrollbar,
    .qc-quick-bar::-webkit-scrollbar,
    .qc-modal-body::-webkit-scrollbar {
      width: 5px; height: 5px;
    }
    .qc-list::-webkit-scrollbar-track,
    .qc-quick-bar::-webkit-scrollbar-track,
    .qc-modal-body::-webkit-scrollbar-track {
      background: transparent;
    }
    .qc-list::-webkit-scrollbar-thumb,
    .qc-quick-bar::-webkit-scrollbar-thumb,
    .qc-modal-body::-webkit-scrollbar-thumb {
      background: var(--_border);
      border-radius: 10px;
    }
    .qc-list::-webkit-scrollbar-thumb:hover,
    .qc-quick-bar::-webkit-scrollbar-thumb:hover,
    .qc-modal-body::-webkit-scrollbar-thumb:hover {
      background: var(--_text-muted);
    }
  `],
    })
], QuickCommandFloatingPanel);



/***/ },

/***/ "./src/qc-i18n.service.ts"
/*!********************************!*\
  !*** ./src/qc-i18n.service.ts ***!
  \********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   QuickCommandI18nService: () => (/* binding */ QuickCommandI18nService)
/* harmony export */ });
/**
 * QuickCommand+ 国际化服务
 * 功能描述：五级回退语言检测 + 中英双语翻译
 * 创建人：iishen717
 * 创建时间：2026-06-26
 */
const translations = {
    'zh-CN': {
        'app.name': 'QuickCmd+',
        'app.title': '快捷命令',
        'app.search': '搜索命令...',
        'app.ungrouped': '未分组',
        'app.noresults': '没有匹配的命令',
        'app.pinned': '常用',
        'app.all_groups': '全部分组',
        'entry.title': 'QuickCmd+ — 拖拽移动，点击打开面板',
        'entry.disconnected': 'SSH 已断开',
        'panel.minimize': '最小化',
        'panel.close': '关闭',
        'panel.restore': '恢复面板',
        'panel.add': '新建命令',
        'panel.edit': '编辑',
        'panel.delete': '删除',
        'panel.delete_confirm': '确定删除 "{name}" 吗？',
        'panel.pin': '固定在快捷入口',
        'panel.unpin': '取消固定',
        'panel.hint.search': '搜索或输入自定义命令',
        'panel.execute': '点击执行',
        'panel.send_and_exec': '发送并执行',
        'panel.send_to_line': '仅发送',
        'panel.multi_step_title': '多步命令提示',
        'panel.multi_step_hint': '该命令包含 {count} 个步骤，是否拼接为一行发送？',
        'panel.param_hint': '输入参数值',
        'panel.send_all_tabs': '发送到所有标签页',
        'panel.copy': '复制命令',
        'panel.drag_reorder': '拖拽排序',
        'panel.drag_reorder_group': '拖拽排序分组',
        'settings.title': 'QuickCmd+',
        'settings.add_cmd': '添加命令',
        'settings.edit_cmd': '编辑命令',
        'settings.name': '名称',
        'settings.text': '命令内容',
        'settings.group': '分组',
        'settings.shortcut': '快捷键',
        'settings.append_cr': '发送并执行',
        'settings.params': '变量参数',
        'settings.pinned': '固定在快捷入口',
        'settings.delay': '步骤延迟(秒)',
        'settings.delay_hint': '延迟执行时间',
        'settings.delay_short': '延迟',
        'settings.add_step': '添加命令',
        'settings.add_break': '添加中断',
        'settings.send_ctrlc': 'Ctrl+C 中断',
        'settings.usage_count': '执行次数',
        'settings.reset': '重置',
        'settings.step_placeholder': '命令',
        'settings.step_type_cmd': '切换为命令模式',
        'settings.step_type_break': '切换为中断',
        'panel.memory_on': '位置记忆已启用',
        'panel.memory_off': '启用位置记忆',
        'settings.ssh_profiles': 'SSH 连接作用域（留空表示全部）',
        'settings.save': '保存',
        'settings.cancel': '取消',
        'settings.ok': '确定',
        'settings.delete': '删除',
        'settings.export': '导出',
        'settings.import': '导入',
        'settings.clear': '清空数据',
        'settings.confirm_delete': '确定删除此命令？',
        'settings.confirm_clear': '确定清空所有命令数据？此操作不可撤销！',
        'settings.language': '界面语言',
        'settings.lang_auto': '自动',
        'settings.lang_zh': '中文',
        'settings.lang_en': 'English',
        'settings.data_management': '数据管理',
        'group.add': '新建分组',
        'group.name': '分组名称',
        'group.delete': '删除分组（命令移至未分组）',
        'group.rename': '重命名',
        'group.edit': '修改分组',
        'group.order': '排序',
        'group.manage': '管理分组',
        'group.delete_confirm': '确定删除分组 "{name}" 吗？分组内的命令将移至未分组。',
        'notify.executed': '命令已执行',
        'notify.copied': '命令已复制',
        'notify.import_ok': '导入成功',
        'notify.import_fail': '导入失败：数据格式无效',
        'notify.cleared': '数据已清空',
        'notify.no_ssh': '当前标签页不是 SSH 连接',
    },
    'en-US': {
        'app.name': 'QuickCmd+',
        'app.title': 'Quick Commands',
        'app.search': 'Search commands...',
        'app.ungrouped': 'Ungrouped',
        'app.noresults': 'No matching commands',
        'app.pinned': 'Favorites',
        'app.all_groups': 'All groups',
        'entry.title': 'QuickCmd+ — drag to move, click to toggle',
        'entry.disconnected': 'SSH disconnected',
        'panel.minimize': 'Minimize',
        'panel.close': 'Close',
        'panel.restore': 'Restore panel',
        'panel.add': 'New command',
        'panel.edit': 'Edit',
        'panel.delete': 'Delete',
        'panel.delete_confirm': 'Delete "{name}"?',
        'panel.pin': 'Pin to quick entry',
        'panel.unpin': 'Unpin',
        'panel.hint.search': 'Search or type custom command',
        'panel.execute': 'Click to execute',
        'panel.send_and_exec': 'Send & Execute',
        'panel.send_to_line': 'Send only',
        'panel.multi_step_title': 'Multi-step Command',
        'panel.multi_step_hint': 'This command has {count} steps. Join into one line?',
        'panel.param_hint': 'Enter parameter value',
        'panel.send_all_tabs': 'Send to all tabs',
        'panel.copy': 'Copy command',
        'panel.drag_reorder': 'Drag to reorder',
        'panel.drag_reorder_group': 'Drag to reorder group',
        'settings.title': 'QuickCmd+',
        'settings.add_cmd': 'Add Command',
        'settings.edit_cmd': 'Edit Command',
        'settings.name': 'Name',
        'settings.text': 'Command Text',
        'settings.group': 'Group',
        'settings.shortcut': 'Shortcut',
        'settings.append_cr': 'Send & Execute',
        'settings.params': 'Parameters',
        'settings.pinned': 'Pin to quick entry',
        'settings.delay': 'Step delay (s)',
        'settings.delay_hint': 'Delay execution time',
        'settings.delay_short': 'Delay',
        'settings.add_step': 'Add Command',
        'settings.add_break': 'Add Break',
        'settings.send_ctrlc': 'Ctrl+C Break',
        'settings.usage_count': 'Usage',
        'settings.reset': 'Reset',
        'settings.step_placeholder': 'Command',
        'settings.step_type_cmd': 'Switch to command',
        'settings.step_type_break': 'Switch to break',
        'panel.memory_on': 'Position memory ON',
        'panel.memory_off': 'Enable position memory',
        'settings.ssh_profiles': 'SSH profile (leave empty for all)',
        'settings.save': 'Save',
        'settings.cancel': 'Cancel',
        'settings.ok': 'OK',
        'settings.delete': 'Delete',
        'settings.export': 'Export',
        'settings.import': 'Import',
        'settings.clear': 'Clear all data',
        'settings.confirm_delete': 'Delete this command?',
        'settings.confirm_clear': 'Clear all command data? This cannot be undone!',
        'settings.language': 'Language',
        'settings.lang_auto': 'Auto',
        'settings.lang_zh': '中文',
        'settings.lang_en': 'English',
        'settings.data_management': 'Data Management',
        'group.add': 'New Group',
        'group.name': 'Group Name',
        'group.order': 'Order',
        'group.delete': 'Delete group (commands become ungrouped)',
        'group.rename': 'Rename',
        'group.edit': 'Edit Group',
        'group.manage': 'Manage Groups',
        'group.delete_confirm': 'Delete group "{name}"? Commands inside will become ungrouped.',
        'notify.executed': 'Command executed',
        'notify.copied': 'Command copied',
        'notify.import_ok': 'Import successful',
        'notify.import_fail': 'Import failed: invalid data format',
        'notify.cleared': 'Data cleared',
        'notify.no_ssh': 'Current tab is not an SSH connection',
    },
};
class QuickCommandI18nService {
    constructor() {
        this.locale = 'zh-CN';
        this.detectLocale();
    }
    detectLocale() {
        const saved = localStorage.getItem('qc-plus-locale');
        if (saved && saved !== 'auto') {
            this.locale = saved === 'en-US' ? 'en-US' : 'zh-CN';
            return;
        }
        // Auto 模式：逐级检测
        const checks = [
            // 1. Tabby localStorage
            () => {
                var _a, _b, _c, _d;
                const keys = ['locale', 'language', 'tabby-language', 'tabby-locale',
                    'config', 'tabby-config', 'settings', 'tabby-settings', 'tabby-config.json'];
                for (const key of keys) {
                    const raw = localStorage.getItem(key);
                    if (!raw)
                        continue;
                    if (/^zh/i.test(raw))
                        return 'zh-CN';
                    if (/^en/i.test(raw))
                        return 'en-US';
                    try {
                        const obj = JSON.parse(raw);
                        const lang = ((_a = obj === null || obj === void 0 ? void 0 : obj.appearance) === null || _a === void 0 ? void 0 : _a.language) || ((_b = obj === null || obj === void 0 ? void 0 : obj.appearance) === null || _b === void 0 ? void 0 : _b.locale)
                            || (obj === null || obj === void 0 ? void 0 : obj.language) || (obj === null || obj === void 0 ? void 0 : obj.locale) || ((_c = obj === null || obj === void 0 ? void 0 : obj.app) === null || _c === void 0 ? void 0 : _c.language) || ((_d = obj === null || obj === void 0 ? void 0 : obj.general) === null || _d === void 0 ? void 0 : _d.language);
                        if (lang)
                            return /^zh/i.test(String(lang)) ? 'zh-CN' : 'en-US';
                    }
                    catch (_e) { }
                }
                return null;
            },
            // 2. Electron process.env
            () => {
                try {
                    const e = (typeof process !== 'undefined' && process.env);
                    if (e) {
                        const lc = e.LC_ALL || e.LANG || e.LANGUAGE || '';
                        if (/^zh/i.test(lc))
                            return 'zh-CN';
                        if (/^en/i.test(lc))
                            return 'en-US';
                    }
                }
                catch (_a) { }
                return null;
            },
            // 3. document.documentElement.lang
            () => {
                var _a;
                try {
                    const dl = ((_a = document.documentElement) === null || _a === void 0 ? void 0 : _a.lang) || '';
                    if (/^zh/i.test(dl))
                        return 'zh-CN';
                    if (/^en/i.test(dl))
                        return 'en-US';
                }
                catch (_b) { }
                return null;
            },
            // 4. navigator.languages（先扫 zh，再扫 en）
            () => {
                try {
                    const nl = navigator.languages || [navigator.language];
                    for (const lang of nl) {
                        if (lang.startsWith('zh'))
                            return 'zh-CN';
                    }
                    for (const lang of nl) {
                        if (lang.startsWith('en'))
                            return 'en-US';
                    }
                }
                catch (_a) { }
                return null;
            },
        ];
        for (const check of checks) {
            const result = check();
            if (result) {
                this.locale = result;
                return;
            }
        }
        // 默认中文
        this.locale = 'zh-CN';
    }
    t(key, params) {
        var _a, _b, _c, _d;
        let text = (_d = (_b = (_a = translations[this.locale]) === null || _a === void 0 ? void 0 : _a[key]) !== null && _b !== void 0 ? _b : (_c = translations['en-US']) === null || _c === void 0 ? void 0 : _c[key]) !== null && _d !== void 0 ? _d : key;
        if (params) {
            for (const [k, v] of Object.entries(params)) {
                text = text.replace(`{${k}}`, String(v));
            }
        }
        return text;
    }
    setLocale(locale) {
        localStorage.setItem('qc-plus-locale', locale);
        if (locale === 'auto') {
            this.detectLocale();
        }
        else {
            this.locale = locale === 'en-US' ? 'en-US' : 'zh-CN';
        }
    }
    getLocale() {
        return this.locale;
    }
}


/***/ },

/***/ "./src/qc-settings.component.ts"
/*!**************************************!*\
  !*** ./src/qc-settings.component.ts ***!
  \**************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   QuickCommandSettingsComponent: () => (/* binding */ QuickCommandSettingsComponent),
/* harmony export */   QuickCommandSettingsTabProvider: () => (/* binding */ QuickCommandSettingsTabProvider)
/* harmony export */ });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "@angular/core");
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_angular_core__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var tabby_settings__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! tabby-settings */ "tabby-settings");
/* harmony import */ var tabby_settings__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(tabby_settings__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _qc_command_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./qc-command.service */ "./src/qc-command.service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
/**
 * QuickCommand+ 设置面板
 * 功能描述：在 Tabby 设置左侧栏注册 QuickCmd+ 配置入口（语言、命令管理、数据备份）
 *   参考 SFTP+ 设置页的 UI 风格
 * 创建人：iishen717
 * 创建时间：2026-06-27
 */



/**
 * 检测 Tabby 实际使用的系统语言
 */
function detectSystemLocale() {
    var _a, _b, _c, _d;
    try {
        const keys = ['locale', 'language', 'tabby-language', 'tabby-locale',
            'config', 'tabby-config', 'settings', 'tabby-settings',
            'tabby-config.json'];
        for (const key of keys) {
            const raw = localStorage.getItem(key);
            if (!raw)
                continue;
            if (/^zh/i.test(raw))
                return 'zh-CN';
            if (/^en/i.test(raw))
                return 'en-US';
            try {
                const obj = JSON.parse(raw);
                const lang = ((_a = obj === null || obj === void 0 ? void 0 : obj.appearance) === null || _a === void 0 ? void 0 : _a.language)
                    || ((_b = obj === null || obj === void 0 ? void 0 : obj.appearance) === null || _b === void 0 ? void 0 : _b.locale)
                    || (obj === null || obj === void 0 ? void 0 : obj.language) || (obj === null || obj === void 0 ? void 0 : obj.locale)
                    || ((_c = obj === null || obj === void 0 ? void 0 : obj.app) === null || _c === void 0 ? void 0 : _c.language) || ((_d = obj === null || obj === void 0 ? void 0 : obj.general) === null || _d === void 0 ? void 0 : _d.language)
                    || (obj === null || obj === void 0 ? void 0 : obj.locale);
                if (lang)
                    return /^zh/i.test(String(lang)) ? 'zh-CN' : 'en-US';
            }
            catch (_e) { }
        }
    }
    catch (_f) { }
    try {
        const langs = navigator.languages || [navigator.language];
        const zhLang = langs.find(l => /^zh/i.test(l));
        if (zhLang)
            return 'zh-CN';
    }
    catch (_g) { }
    try {
        const navLang = navigator.language || '';
        if (navLang)
            return /^zh/i.test(navLang) ? 'zh-CN' : 'en-US';
    }
    catch (_h) { }
    return 'zh-CN';
}
let QuickCommandSettingsComponent = class QuickCommandSettingsComponent {
    get effectiveLang() {
        if (this.lang === 'zh-CN' || this.lang === 'en-US')
            return this.lang;
        return detectSystemLocale();
    }
    get namedGroups() {
        return this.groups.filter(g => g.name);
    }
    t(zh, en) {
        if (this.effectiveLang === 'en-US' && en)
            return en;
        return zh;
    }
    /** 获取颜色主题的本地化名称 */
    themeLabel(c) {
        const labels = {
            'acrylic-light': ['毛玻璃·浅', 'Acrylic Light'],
            'acrylic-dark': ['毛玻璃·深', 'Acrylic Dark'],
            'ocean': ['海洋蓝', 'Ocean'],
            'forest': ['森林绿', 'Forest'],
            'sunset': ['日落橙', 'Sunset'],
            'lavender': ['薰衣草紫', 'Lavender'],
            'custom': ['自定义', 'Custom'],
        };
        const pair = labels[c.value];
        if (pair)
            return this.t(pair[0], pair[1]);
        return c.label || '';
    }
    constructor() {
        this.commands = [];
        this.groups = [];
        this.lang = (() => {
            const v = localStorage.getItem('qc-plus-locale');
            if (v === 'zh-CN' || v === 'en-US')
                return v;
            return '';
        })();
        /*
         * 毛玻璃配色预设 — 字段说明
         * ───────────────────────────────────────────
         * bg / bgRgb         面板整体背景（rgba 半透明实现毛玻璃）/ 对应 RGB 分量
         * text                主文字颜色（命令名、标题等）
         * textSecondary       次要文字颜色（搜索框文字、命令预览等）
         * textMuted           辅助文字颜色（图标、提示、占位符等）
         * groupName           分组夹名称颜色
         * primary / primaryRgb 主色调（按钮、链接、选中态、快速入口边框）/ 对应 RGB 分量
         * surface / surfaceRgb 标题栏 / 卡片 / 元素背景色 / 对应 RGB 分量
         * border              边框颜色（面板、输入框、分隔线等）
         * inputBg             输入框背景色（搜索框、编辑弹窗输入框等）
         * hover               悬停高亮背景色
         * blur                毛玻璃模糊程度（blur 值）
         * saturate            毛玻璃饱和度（saturate 值）
         * shadow              面板整体阴影
         */
        this.colorThemes = [
            { value: 'acrylic-light', label: '毛玻璃·浅', bg: 'rgba(213,213,216,0.96)', bgRgb: '213,213,216', text: '#162234', textSecondary: '#939aa7', textMuted: '#8c97ab', groupName: '#1a2233', primary: '#4f7dff', primaryRgb: '79,125,255', surface: 'rgba(255,255,255,0.34)', surfaceRgb: '255,255,255', border: 'rgba(255,255,255,0.28)', inputBg: 'rgba(255,255,255,0.52)', hover: 'rgba(255,255,255,0.24)', blur: '28px', saturate: '180%', shadow: '0 10px 38px rgba(0,0,0,0.16)' },
            { value: 'acrylic-dark', label: '毛玻璃·深', bg: 'rgba(20,20,20,0.52)', bgRgb: '20,20,20', text: '#e8e8e8', textSecondary: '#b2b2b2', textMuted: '#8f8f8f', groupName: '#b2b2b2', primary: '#5b8def', primaryRgb: '91,141,239', surface: 'rgba(45,45,45,0.42)', surfaceRgb: '45,45,45', border: 'rgba(255,255,255,0.10)', inputBg: 'rgba(255,255,255,0.08)', hover: 'rgba(255,255,255,0.06)', blur: '30px', saturate: '145%', shadow: '0 10px 38px rgba(0,0,0,0.40)' },
            { value: 'ocean', label: '海洋蓝', bg: 'rgba(8,24,48,0.60)', bgRgb: '8,24,48', text: '#e0f0ff', textSecondary: '#90b8e0', textMuted: '#5888b8', groupName: '#90b8e0', primary: '#22d3ee', primaryRgb: '34,211,238', surface: 'rgba(20,50,90,0.35)', surfaceRgb: '20,50,90', border: 'rgba(100,180,240,0.14)', inputBg: 'rgba(10,30,60,0.50)', hover: 'rgba(100,160,220,0.08)', blur: '26px', saturate: '170%', shadow: '0 10px 38px rgba(0,40,80,0.40)' },
            { value: 'forest', label: '森林绿', bg: 'rgba(8,28,16,0.58)', bgRgb: '8,28,16', text: '#d8f8e0', textSecondary: '#80c898', textMuted: '#509868', groupName: '#80c898', primary: '#34d399', primaryRgb: '52,211,153', surface: 'rgba(16,50,28,0.35)', surfaceRgb: '16,50,28', border: 'rgba(80,180,120,0.12)', inputBg: 'rgba(8,30,16,0.48)', hover: 'rgba(80,160,100,0.08)', blur: '26px', saturate: '155%', shadow: '0 10px 38px rgba(0,30,10,0.40)' },
            { value: 'sunset', label: '日落橙', bg: 'rgba(40,16,8,0.62)', bgRgb: '40,16,8', text: '#ffe8d8', textSecondary: '#d0a088', textMuted: '#a07058', groupName: '#d0a088', primary: '#fb923c', primaryRgb: '251,146,60', surface: 'rgba(60,24,12,0.38)', surfaceRgb: '60,24,12', border: 'rgba(200,120,80,0.14)', inputBg: 'rgba(30,10,4,0.50)', hover: 'rgba(200,100,60,0.08)', blur: '24px', saturate: '150%', shadow: '0 10px 38px rgba(40,10,0,0.40)' },
            { value: 'lavender', label: '薰衣草紫', bg: 'rgba(22,14,36,0.58)', bgRgb: '22,14,36', text: '#ece0fc', textSecondary: '#b098d0', textMuted: '#7a60a8', groupName: '#b098d0', primary: '#a78bfa', primaryRgb: '167,139,250', surface: 'rgba(36,22,58,0.38)', surfaceRgb: '36,22,58', border: 'rgba(150,120,210,0.14)', inputBg: 'rgba(18,10,30,0.50)', hover: 'rgba(140,100,200,0.08)', blur: '28px', saturate: '160%', shadow: '0 10px 38px rgba(20,10,30,0.40)' },
            { value: 'custom', label: '自定义', bg: 'rgba(22,22,28,0.72)', bgRgb: '22,22,28', text: '#e8e8e8', textSecondary: '#b0b0b0', textMuted: '#7a7a8a', groupName: '#b0b0b0', primary: '#5b8def', primaryRgb: '91,141,239', surface: 'rgba(255,255,255,0.06)', surfaceRgb: '255,255,255', border: 'rgba(255,255,255,0.10)', inputBg: 'rgba(255,255,255,0.08)', hover: 'rgba(255,255,255,0.06)', blur: '24px', saturate: '160%', shadow: '0 8px 40px rgba(0,0,0,0.42)' },
        ];
        this.colorTheme = localStorage.getItem('qc-plus-theme') || '';
        this.colorPrimary = localStorage.getItem('qc-plus-color-primary') || '';
        this.colorPrimaryRgb = localStorage.getItem('qc-plus-color-primary-rgb') || '';
        this.colorBg = localStorage.getItem('qc-plus-color-bg') || '';
        this.colorBgRgb = localStorage.getItem('qc-plus-color-bg-rgb') || '';
        this.colorText = localStorage.getItem('qc-plus-color-text') || '';
        this.colorTextSecondary = localStorage.getItem('qc-plus-color-text-secondary') || '';
        this.colorMuted = localStorage.getItem('qc-plus-color-text-muted') || '';
        this.colorGroupName = localStorage.getItem('qc-plus-color-group-name') || '';
        this.colorSurface = localStorage.getItem('qc-plus-color-surface') || '';
        this.colorSurfaceRgb = localStorage.getItem('qc-plus-color-surface-rgb') || '';
        this.colorBorder = localStorage.getItem('qc-plus-color-border') || '';
        this.colorHover = localStorage.getItem('qc-plus-color-hover') || '';
        this.colorInputBg = localStorage.getItem('qc-plus-color-input-bg') || '';
        this.colorBlur = localStorage.getItem('qc-plus-color-blur') || '';
        this.colorSaturate = localStorage.getItem('qc-plus-color-saturate') || '';
        this.colorShadow = localStorage.getItem('qc-plus-color-shadow') || '';
        // 字体大小（px）
        this.fontSize = +(localStorage.getItem('qc-plus-font-size') || '14');
        // 入口模式
        this.entryMode = new _qc_command_service__WEBPACK_IMPORTED_MODULE_2__.QuickCommandService().getEntryMode();
        this.svc = new _qc_command_service__WEBPACK_IMPORTED_MODULE_2__.QuickCommandService();
        // 清空数据确认弹窗
        this.showClearConfirm = false;
        this.clearConfirmInput = '';
        this.refresh();
        // 预设主题：启动时重新应用 CSS 变量（applySavedTheme 已清除残留，需在此补上预设值）
        if (this.colorTheme && this.colorTheme !== 'custom' && this.colorTheme !== '') {
            this.setColorTheme(this.colorTheme);
        }
        // 自定义模式：从 localStorage 逐项恢复颜色变量
        if (this.colorTheme === 'custom' && this.colorPrimary && this.colorBg && this.colorText) {
            const root = document.documentElement;
            const apply = (prop, key) => {
                const val = localStorage.getItem(`qc-plus-color-${key}`);
                if (val)
                    root.style.setProperty(`--qc-${prop}`, val);
            };
            apply('primary', 'primary');
            apply('primary-rgb', 'primary-rgb');
            apply('bg', 'bg');
            apply('bg-rgb', 'bg-rgb');
            apply('text', 'text');
            apply('text-secondary', 'text-secondary');
            apply('text-muted', 'text-muted');
            apply('group-name', 'group-name');
            apply('border', 'border');
            apply('surface', 'surface');
            apply('surface-rgb', 'surface-rgb');
            apply('hover', 'hover');
            apply('input-bg', 'input-bg');
            apply('blur', 'blur');
            apply('saturate', 'saturate');
            apply('shadow', 'shadow');
        }
        const savedFontSize = localStorage.getItem('qc-plus-font-size');
        if (savedFontSize) {
            document.documentElement.style.setProperty('--qc-font-size', savedFontSize + 'px');
        }
    }
    refresh() {
        this.commands = this.svc.getAll();
        this.groups = this.svc.getGroups();
        this.notifyPanels();
    }
    /** 通知所有浮动面板数据或语言已变更 */
    notifyPanels() {
        try {
            window.dispatchEvent(new CustomEvent('qc-plus-data-changed'));
        }
        catch (_a) { }
    }
    onLangChange() {
        localStorage.setItem('qc-plus-locale', this.lang || 'auto');
        window.dispatchEvent(new CustomEvent('qc-plus-locale-changed', { detail: this.lang || 'auto' }));
        this.notifyPanels();
    }
    onFontSizeChange(val) {
        this.fontSize = Math.max(11, Math.min(18, val));
        localStorage.setItem('qc-plus-font-size', String(this.fontSize));
        const root = document.documentElement;
        root.style.setProperty('--qc-font-size', this.fontSize + 'px');
        this.notifyPanels();
    }
    onEntryModeChange() {
        new _qc_command_service__WEBPACK_IMPORTED_MODULE_2__.QuickCommandService().saveEntryMode(this.entryMode);
        // 通过 window 事件 + 全局回调 通知所有终端装饰器重建入口
        window.dispatchEvent(new CustomEvent('qc-plus-entry-mode-changed', { detail: this.entryMode }));
        // 全局回调兜底（设置面板先触发事件，等下一帧再触达已经就绪的监听器）
        if (typeof window.__qcRebuildEntry === 'function') {
            ;
            window.__qcRebuildEntry();
        }
        // 兜底：直接触发所有已知入口的 data 属性变更来触发重建
        try {
            const els = document.querySelectorAll('[data-qc-entry="1"]');
            for (let i = 0; i < els.length; i++) {
                const el = els[i];
                el.dispatchEvent(new CustomEvent('qc-mode-change', { bubbles: true }));
            }
        }
        catch (_a) { }
    }
    openGithub() {
        const url = 'https://github.com/iishen717/Tabby-QuickCmd-Plus';
        try {
            // Electron shell
            ;
            window.require('electron').shell.openExternal(url);
        }
        catch (_a) {
            try {
                // 标准浏览器
                window.open(url, '_blank');
            }
            catch (_b) {
                // 兜底
                location.href = url;
            }
        }
    }
    setColorTheme(value) {
        this.colorTheme = value;
        localStorage.setItem('qc-plus-theme', value);
        if (value === 'custom') {
            const savedPrimary = localStorage.getItem('qc-plus-color-primary');
            if (savedPrimary) {
                this.colorPrimary = savedPrimary;
                this.colorPrimaryRgb = localStorage.getItem('qc-plus-color-primary-rgb') || '91,141,239';
                this.colorBg = localStorage.getItem('qc-plus-color-bg') || 'rgba(22,22,28,0.72)';
                this.colorBgRgb = localStorage.getItem('qc-plus-color-bg-rgb') || '22,22,28';
                this.colorText = localStorage.getItem('qc-plus-color-text') || '#e8e8e8';
                this.colorTextSecondary = localStorage.getItem('qc-plus-color-text-secondary') || '#b0b0b0';
                this.colorMuted = localStorage.getItem('qc-plus-color-text-muted') || '#7a7a8a';
                this.colorSurface = localStorage.getItem('qc-plus-color-surface') || 'rgba(255,255,255,0.06)';
                this.colorSurfaceRgb = localStorage.getItem('qc-plus-color-surface-rgb') || '255,255,255';
                this.colorBorder = localStorage.getItem('qc-plus-color-border') || 'rgba(255,255,255,0.10)';
                this.colorHover = localStorage.getItem('qc-plus-color-hover') || 'rgba(255,255,255,0.06)';
                this.colorInputBg = localStorage.getItem('qc-plus-color-input-bg') || 'rgba(255,255,255,0.08)';
                this.colorBlur = localStorage.getItem('qc-plus-color-blur') || '24px';
                this.colorSaturate = localStorage.getItem('qc-plus-color-saturate') || '160%';
                this.colorShadow = localStorage.getItem('qc-plus-color-shadow') || '0 8px 40px rgba(0,0,0,0.42)';
                this.colorGroupName = localStorage.getItem('qc-plus-color-group-name') || '#b0b0b0';
            }
            else {
                this.colorPrimary = '#5b8def';
                this.colorPrimaryRgb = '91,141,239';
                this.colorBg = 'rgba(22,22,28,0.72)';
                this.colorBgRgb = '22,22,28';
                this.colorText = '#e8e8e8';
                this.colorTextSecondary = '#b0b0b0';
                this.colorMuted = '#7a7a8a';
                this.colorSurface = 'rgba(255,255,255,0.06)';
                this.colorSurfaceRgb = '255,255,255';
                this.colorBorder = 'rgba(255,255,255,0.10)';
                this.colorHover = 'rgba(255,255,255,0.06)';
                this.colorInputBg = 'rgba(255,255,255,0.08)';
                this.colorBlur = '24px';
                this.colorSaturate = '160%';
                this.colorShadow = '0 8px 40px rgba(0,0,0,0.42)';
                this.colorGroupName = '#b0b0b0';
            }
            this.applyColorTheme();
            this.updateCustomPreview();
            return;
        }
        // 从 colorThemes 数组读取预设值（唯一数据源）
        const p = this.colorThemes.find(t => t.value === value);
        if (value && p) {
            const root = document.documentElement;
            root.style.setProperty('--qc-primary', p.primary);
            root.style.setProperty('--qc-primary-rgb', p.primaryRgb);
            root.style.setProperty('--qc-bg', p.bg);
            root.style.setProperty('--qc-bg-rgb', p.bgRgb);
            root.style.setProperty('--qc-text', p.text);
            root.style.setProperty('--qc-text-secondary', p.textSecondary);
            root.style.setProperty('--qc-text-muted', p.textMuted);
            root.style.setProperty('--qc-border', p.border);
            root.style.setProperty('--qc-surface', p.surface);
            root.style.setProperty('--qc-surface-rgb', p.surfaceRgb);
            root.style.setProperty('--qc-hover', p.hover);
            root.style.setProperty('--qc-input-bg', p.inputBg);
            root.style.setProperty('--qc-blur', p.blur);
            root.style.setProperty('--qc-saturate', p.saturate);
            root.style.setProperty('--qc-shadow', p.shadow);
            if (p.groupName)
                root.style.setProperty('--qc-group-name', p.groupName);
        }
        else {
            // Auto: clear custom vars
            this.colorPrimary = '';
            this.colorBg = '';
            this.colorText = '';
            this.clearColorVars();
        }
        this.notifyPanels();
    }
    applyColorTheme() {
        localStorage.setItem('qc-plus-theme', 'custom');
        this.colorTheme = 'custom';
        this.saveColorVars();
        this.notifyPanels();
    }
    /** 同步自定义配色到 colorThemes 数组，使预览实时更新 */
    updateCustomPreview() {
        const custom = this.colorThemes.find(t => t.value === 'custom');
        if (custom) {
            custom.primary = this.colorPrimary;
            custom.primaryRgb = this.colorPrimaryRgb;
            custom.bg = this.colorBg;
            custom.bgRgb = this.colorBgRgb;
            custom.text = this.colorText;
            custom.textSecondary = this.colorTextSecondary;
            custom.textMuted = this.colorMuted;
            custom.groupName = this.colorGroupName;
            custom.surface = this.colorSurface;
            custom.surfaceRgb = this.colorSurfaceRgb;
            custom.border = this.colorBorder;
            custom.hover = this.colorHover;
            custom.inputBg = this.colorInputBg;
            custom.blur = this.colorBlur;
            custom.saturate = this.colorSaturate;
            custom.shadow = this.colorShadow;
        }
    }
    saveColorVars(p) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7;
        const root = document.documentElement;
        root.style.setProperty('--qc-primary', (_a = p === null || p === void 0 ? void 0 : p.primary) !== null && _a !== void 0 ? _a : this.colorPrimary);
        root.style.setProperty('--qc-primary-rgb', (_b = p === null || p === void 0 ? void 0 : p.primaryRgb) !== null && _b !== void 0 ? _b : this.colorPrimaryRgb);
        root.style.setProperty('--qc-bg', (_c = p === null || p === void 0 ? void 0 : p.bg) !== null && _c !== void 0 ? _c : this.colorBg);
        root.style.setProperty('--qc-bg-rgb', (_d = p === null || p === void 0 ? void 0 : p.bgRgb) !== null && _d !== void 0 ? _d : this.colorBgRgb);
        root.style.setProperty('--qc-text', (_e = p === null || p === void 0 ? void 0 : p.text) !== null && _e !== void 0 ? _e : this.colorText);
        root.style.setProperty('--qc-text-secondary', (_f = p === null || p === void 0 ? void 0 : p.textSecondary) !== null && _f !== void 0 ? _f : this.colorTextSecondary);
        root.style.setProperty('--qc-text-muted', (_g = p === null || p === void 0 ? void 0 : p.textMuted) !== null && _g !== void 0 ? _g : this.colorMuted);
        root.style.setProperty('--qc-border', (_h = p === null || p === void 0 ? void 0 : p.border) !== null && _h !== void 0 ? _h : this.colorBorder);
        root.style.setProperty('--qc-surface', (_j = p === null || p === void 0 ? void 0 : p.surface) !== null && _j !== void 0 ? _j : this.colorSurface);
        root.style.setProperty('--qc-surface-rgb', (_k = p === null || p === void 0 ? void 0 : p.surfaceRgb) !== null && _k !== void 0 ? _k : this.colorSurfaceRgb);
        root.style.setProperty('--qc-hover', (_l = p === null || p === void 0 ? void 0 : p.hover) !== null && _l !== void 0 ? _l : this.colorHover);
        root.style.setProperty('--qc-input-bg', (_m = p === null || p === void 0 ? void 0 : p.inputBg) !== null && _m !== void 0 ? _m : this.colorInputBg);
        root.style.setProperty('--qc-blur', (_o = p === null || p === void 0 ? void 0 : p.blur) !== null && _o !== void 0 ? _o : this.colorBlur);
        root.style.setProperty('--qc-saturate', (_p = p === null || p === void 0 ? void 0 : p.saturate) !== null && _p !== void 0 ? _p : this.colorSaturate);
        root.style.setProperty('--qc-shadow', (_q = p === null || p === void 0 ? void 0 : p.shadow) !== null && _q !== void 0 ? _q : this.colorShadow);
        root.style.setProperty('--qc-group-name', (_r = p === null || p === void 0 ? void 0 : p.groupName) !== null && _r !== void 0 ? _r : this.colorGroupName);
        const keys = [
            { k: 'primary', v: (_s = p === null || p === void 0 ? void 0 : p.primary) !== null && _s !== void 0 ? _s : this.colorPrimary },
            { k: 'primary-rgb', v: (_t = p === null || p === void 0 ? void 0 : p.primaryRgb) !== null && _t !== void 0 ? _t : this.colorPrimaryRgb },
            { k: 'bg', v: (_u = p === null || p === void 0 ? void 0 : p.bg) !== null && _u !== void 0 ? _u : this.colorBg },
            { k: 'bg-rgb', v: (_v = p === null || p === void 0 ? void 0 : p.bgRgb) !== null && _v !== void 0 ? _v : this.colorBgRgb },
            { k: 'text', v: (_w = p === null || p === void 0 ? void 0 : p.text) !== null && _w !== void 0 ? _w : this.colorText },
            { k: 'text-secondary', v: (_x = p === null || p === void 0 ? void 0 : p.textSecondary) !== null && _x !== void 0 ? _x : this.colorTextSecondary },
            { k: 'text-muted', v: (_y = p === null || p === void 0 ? void 0 : p.textMuted) !== null && _y !== void 0 ? _y : this.colorMuted },
            { k: 'group-name', v: (_z = p === null || p === void 0 ? void 0 : p.groupName) !== null && _z !== void 0 ? _z : this.colorGroupName },
            { k: 'border', v: (_0 = p === null || p === void 0 ? void 0 : p.border) !== null && _0 !== void 0 ? _0 : this.colorBorder },
            { k: 'surface', v: (_1 = p === null || p === void 0 ? void 0 : p.surface) !== null && _1 !== void 0 ? _1 : this.colorSurface },
            { k: 'surface-rgb', v: (_2 = p === null || p === void 0 ? void 0 : p.surfaceRgb) !== null && _2 !== void 0 ? _2 : this.colorSurfaceRgb },
            { k: 'hover', v: (_3 = p === null || p === void 0 ? void 0 : p.hover) !== null && _3 !== void 0 ? _3 : this.colorHover },
            { k: 'input-bg', v: (_4 = p === null || p === void 0 ? void 0 : p.inputBg) !== null && _4 !== void 0 ? _4 : this.colorInputBg },
            { k: 'blur', v: (_5 = p === null || p === void 0 ? void 0 : p.blur) !== null && _5 !== void 0 ? _5 : this.colorBlur },
            { k: 'saturate', v: (_6 = p === null || p === void 0 ? void 0 : p.saturate) !== null && _6 !== void 0 ? _6 : this.colorSaturate },
            { k: 'shadow', v: (_7 = p === null || p === void 0 ? void 0 : p.shadow) !== null && _7 !== void 0 ? _7 : this.colorShadow },
        ];
        keys.forEach(({ k, v }) => localStorage.setItem(`qc-plus-color-${k}`, v));
    }
    clearColorVars() {
        const root = document.documentElement;
        const vars = ['--qc-primary', '--qc-primary-rgb', '--qc-bg', '--qc-bg-rgb', '--qc-text', '--qc-text-secondary', '--qc-text-muted',
            '--qc-group-name', '--qc-border', '--qc-surface', '--qc-surface-rgb', '--qc-hover', '--qc-input-bg', '--qc-blur', '--qc-saturate', '--qc-shadow'];
        vars.forEach(v => root.style.removeProperty(v));
        const allKeys = ['qc-plus-color-primary', 'qc-plus-color-primary-rgb', 'qc-plus-color-bg', 'qc-plus-color-bg-rgb',
            'qc-plus-color-text', 'qc-plus-color-text-secondary', 'qc-plus-color-text-muted', 'qc-plus-color-group-name',
            'qc-plus-color-border', 'qc-plus-color-surface', 'qc-plus-color-surface-rgb', 'qc-plus-color-hover',
            'qc-plus-color-input-bg', 'qc-plus-color-blur', 'qc-plus-color-saturate', 'qc-plus-color-shadow'];
        allKeys.forEach(k => localStorage.removeItem(k));
    }
    openClearConfirm() {
        this.clearConfirmInput = '';
        this.showClearConfirm = true;
        setTimeout(() => {
            const input = document.querySelector('.qc-edit-modal .qc-edit-input');
            if (input)
                input.focus();
        }, 50);
    }
    closeClearConfirm() {
        this.showClearConfirm = false;
        this.clearConfirmInput = '';
    }
    doClearData() {
        if (this.clearConfirmInput !== 'DELETE')
            return;
        this.showClearConfirm = false;
        this.clearConfirmInput = '';
        this.svc['commands'] = [];
        this.svc['groups'] = [];
        this.svc['saveCommands']();
        this.svc['saveGroups']();
        this.refresh();
        alert(this.t('已清空所有数据', 'All data cleared'));
    }
    clearData() {
        if (confirm(this.t('确定清空所有命令数据？此操作不可撤销！', 'Clear all command data? This cannot be undone!'))) {
            this.svc['commands'] = [];
            this.svc['groups'] = [];
            this.svc['saveCommands']();
            this.svc['saveGroups']();
            this.refresh();
        }
    }
    /** 获取当前主题对应颜色值（用于 color input 显示） */
    currentColor(c, key) {
        if (this.colorTheme === 'custom') {
            const map = {
                primary: this.colorPrimary, bg: this.colorBg, text: this.colorText,
                surface: this.colorSurface, border: this.colorBorder, muted: this.colorMuted,
                groupName: this.colorGroupName,
            };
            const val = map[key] || c[key] || c['textMuted'] || '';
            return this.toHexColor(val);
        }
        return this.toHexColor(c[key] || c['textMuted'] || '');
    }
    /** 尝试从 rgba 字符串提取 hex 给 color input 使用 */
    toHexColor(val) {
        if (!val)
            return '#808080';
        if (/^#[0-9a-fA-F]{3,8}$/.test(val))
            return val;
        const m = val.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        if (m) {
            return '#' + [m[1], m[2], m[3]].map(x => (+x).toString(16).padStart(2, '0')).join('');
        }
        return '#808080';
    }
    /** 颜色值变更时自动切换为自定义模式 */
    onColorChange(key, val) {
        if (this.colorTheme !== 'custom') {
            const activeTheme = this.colorThemes.find(t => t.value === this.colorTheme);
            if (activeTheme) {
                this.colorPrimary = activeTheme.primary;
                this.colorPrimaryRgb = activeTheme.primaryRgb || '';
                this.colorBg = activeTheme.bg;
                this.colorBgRgb = activeTheme.bgRgb || '';
                this.colorText = activeTheme.text;
                this.colorTextSecondary = activeTheme.textSecondary || '';
                this.colorMuted = activeTheme.textMuted || '';
                this.colorSurface = activeTheme.surface;
                this.colorSurfaceRgb = activeTheme.surfaceRgb || '';
                this.colorBorder = activeTheme.border;
                this.colorHover = activeTheme.hover || '';
                this.colorInputBg = activeTheme.inputBg || '';
                this.colorBlur = activeTheme.blur || '';
                this.colorSaturate = activeTheme.saturate || '';
                this.colorShadow = activeTheme.shadow || '';
                this.colorGroupName = activeTheme.groupName || '';
            }
            this.colorTheme = 'custom';
            localStorage.setItem('qc-plus-theme', 'custom');
        }
        const map = {
            primary: this.colorPrimary, bg: this.colorBg, text: this.colorText,
            surface: this.colorSurface, border: this.colorBorder, muted: this.colorMuted,
            groupName: this.colorGroupName,
        };
        map[key] = val;
        ({ primary: this.colorPrimary, bg: this.colorBg, text: this.colorText,
            surface: this.colorSurface, border: this.colorBorder, muted: this.colorMuted,
            groupName: this.colorGroupName } = map);
        this.saveColorVars();
        this.updateCustomPreview();
        this.notifyPanels();
    }
    exportData() {
        const json = this.svc.exportAll();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
        a.download = `quick-cmd-plus_backup_${ts}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    onImport(event) {
        var _a;
        const input = event.target;
        const file = (_a = input === null || input === void 0 ? void 0 : input.files) === null || _a === void 0 ? void 0 : _a[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = () => {
            const ok = this.svc.importAll(reader.result);
            if (ok)
                alert(this.t('导入成功', 'Import successful'));
            else
                alert(this.t('导入失败：文件格式无效', 'Import failed: invalid file format'));
            this.refresh();
        };
        reader.readAsText(file);
        input.value = '';
    }
};
QuickCommandSettingsComponent = __decorate([
    (0,_angular_core__WEBPACK_IMPORTED_MODULE_0__.Component)({
        template: `
    <div class="qc-settings-page">
      <h3 class="qs-title">QuickCmd+</h3>
      <p class="qs-desc">{{ t('快捷命令管理面板，创建和管理常用命令。', 'Quick command panel, create and manage commands.') }}</p>

      <!-- 语言 -->
      <div class="qs-section">
        <label class="qs-label">{{ t('语言', 'Language') }}</label>
        <select [(ngModel)]="lang" (ngModelChange)="onLangChange()" class="qs-select">
          <option value="">{{ t('自动', 'Auto') }}</option>
          <option value="zh-CN">中文</option>
          <option value="en-US">English</option>
        </select>
      </div>

      <!-- 界面 -->
      <div class="qs-section">
        <label class="qs-label">{{ t('界面', 'Interface') }}</label>
        <div class="qs-color-row">
          <label *ngFor="let c of colorThemes" class="qs-color-swatch"
            [class.qs-color-active]="colorTheme === c.value"
            (click)="setColorTheme(c.value)">
            <span class="qs-color-swatch-name">{{ themeLabel(c) }}</span>
            <span class="qs-color-swatch-preview" [style.background]="c.bg">
              <span class="qs-cp-title" [style.background]="c.surface" [style.color]="c.text">{{ themeLabel(c) }}</span>
              <span class="qs-cp-body" [style.color]="c.muted">
                <span class="qs-cp-line" [style.color]="c.text">cmd</span>
                <span class="qs-cp-accent" [style.background]="c.primary"></span>
              </span>
            </span>
          </label>
        </div>

        <div class="qs-scheme-preview" *ngFor="let c of colorThemes" [hidden]="colorTheme !== c.value">
          <div class="qs-glass-preview" [style.background]="c.bg" [style.backdrop-filter]="'blur(' + (c.blur || '24px') + ') saturate(' + (c.saturate || '160%') + ')'" [style.border]="'1px solid ' + (c.border || 'rgba(255,255,255,0.1)')" [style.box-shadow]="c.shadow">
            <div class="qs-gp-titlebar" [style.background]="c.surface">
              <span class="qs-gp-dot" [style.background]="c.primary"></span>
              <span class="qs-gp-title" [style.color]="c.text">Quick Cmd+</span>
            </div>
            <div class="qs-gp-body">
              <span class="qs-gp-cmd" [style.color]="c.textSecondary || c.text">deploy-app</span>
              <span class="qs-gp-cmd" [style.color]="c.textMuted || c.muted">./deploy.sh --prod</span>
            </div>
          </div>
          <div class="qs-color-fields">
            <div class="qs-color-field">
              <label>{{ t('主色调', 'Primary') }}</label>
              <input type="color" [ngModel]="currentColor(c, 'primary')" (ngModelChange)="onColorChange('primary', $event)" class="qs-color-input">
              <span class="qs-color-val">{{ currentColor(c, 'primary') }}</span>
            </div>
            <div class="qs-color-field">
              <label>{{ t('背景', 'Bg') }}</label>
              <input type="color" [ngModel]="currentColor(c, 'bg')" (ngModelChange)="onColorChange('bg', $event)" class="qs-color-input">
              <span class="qs-color-val">{{ currentColor(c, 'bg') }}</span>
            </div>
            <div class="qs-color-field">
              <label>{{ t('文字', 'Text') }}</label>
              <input type="color" [ngModel]="currentColor(c, 'text')" (ngModelChange)="onColorChange('text', $event)" class="qs-color-input">
              <span class="qs-color-val">{{ currentColor(c, 'text') }}</span>
            </div>
            <div class="qs-color-field">
              <label>{{ t('标题栏', 'Surface') }}</label>
              <input type="color" [ngModel]="currentColor(c, 'surface')" (ngModelChange)="onColorChange('surface', $event)" class="qs-color-input">
              <span class="qs-color-val">{{ currentColor(c, 'surface') }}</span>
            </div>
            <div class="qs-color-field">
              <label>{{ t('边框', 'Border') }}</label>
              <input type="color" [ngModel]="currentColor(c, 'border')" (ngModelChange)="onColorChange('border', $event)" class="qs-color-input">
              <span class="qs-color-val">{{ currentColor(c, 'border') }}</span>
            </div>
            <div class="qs-color-field">
              <label>{{ t('次要文字', 'Muted') }}</label>
              <input type="color" [ngModel]="currentColor(c, 'muted')" (ngModelChange)="onColorChange('muted', $event)" class="qs-color-input">
              <span class="qs-color-val">{{ currentColor(c, 'muted') }}</span>
            </div>
            <div class="qs-color-field">
              <label>{{ t('分组名称', 'Group Name') }}</label>
              <input type="color" [ngModel]="currentColor(c, 'groupName')" (ngModelChange)="onColorChange('groupName', $event)" class="qs-color-input">
              <span class="qs-color-val">{{ currentColor(c, 'groupName') }}</span>
            </div>
          </div>
        </div>

        <!-- 字体大小 -->
        <div class="qs-font-row">
          <label class="qs-font-label">{{ t('字体大小', 'Font Size') }}</label>
          <div class="qs-font-control">
            <input type="range" min="11" max="18" step="1"
              [value]="fontSize" (input)="onFontSizeChange(+$any($event.target).value)"
              class="qs-range">
            <span class="qs-font-val">{{ fontSize }}px</span>
          </div>
        </div>

        <!-- 入口模式 -->
        <div class="qs-entry-mode-row">
          <label style="font-size:13px; font-weight:500;">{{ t('入口模式', 'Entry Mode') }}</label>
          <div class="qs-entry-mode-options">
            <label class="qs-entry-mode-option"
              [class.qs-entry-mode-active]="entryMode === 'toolbar'">
              <input type="radio" name="entryMode" value="toolbar"
                [(ngModel)]="entryMode" (ngModelChange)="onEntryModeChange()">
              <span>{{ t('工具栏按钮', 'Toolbar') }}</span>
            </label>
            <label class="qs-entry-mode-option"
              [class.qs-entry-mode-active]="entryMode === 'floating'">
              <input type="radio" name="entryMode" value="floating"
                [(ngModel)]="entryMode" (ngModelChange)="onEntryModeChange()">
              <span>{{ t('浮动按钮', 'Floating') }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- 数据 -->
      <div class="qs-section">
        <label class="qs-label">{{ t('数据', 'Data') }}</label>
        <div class="qs-backup-row">
          <button class="qs-btn" (click)="exportData()">[&uarr;] {{ t('导出数据', 'Export') }}</button>
          <label class="qs-btn qs-btn-import">[&darr;] {{ t('导入数据', 'Import') }}
            <input type="file" accept=".json" (change)="onImport($event)" style="display:none" />
          </label>
          <button class="qs-btn qs-btn-danger" (click)="openClearConfirm()">[&times;] {{ t('清空数据', 'Clear All') }}</button>
        </div>
      </div>

      <!-- 关于 -->
      <div class="qs-section">
        <label class="qs-label">{{ t('关于', 'About') }}</label>
        <div class="qs-about-row">
          <span class="qs-about-item">{{ t('版本', 'Version') }}: 1.0.0</span>
          <span class="qs-about-item">{{ t('作者', 'Author') }}: iishen717</span>
          <span class="qs-about-link" (click)="openGithub()">
            <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8"/></svg>
            {{ t('Github源码', 'GitHub Source') }}
          </span>
        </div>
      </div>
    </div>

    <!-- 清空数据确认弹窗 -->
    <div class="qc-overlay" *ngIf="showClearConfirm" (click)="closeClearConfirm()">
      <div class="qc-edit-modal" (click)="$event.stopPropagation()">
        <div class="qc-edit-title" style="color:var(--_primary,#e24b4a);">{{ t('⚠️ 清空数据', '⚠️ Clear All Data') }}</div>
        <div class="qc-edit-field">
          <p style="font-size:13px; line-height:1.6; margin:0 0 12px 0;">
            {{ t('此操作将删除所有命令和分组数据，不可撤销！', 'This will delete all commands and groups, and cannot be undone!') }}
          </p>
          <label style="font-size:12px; opacity:.8;">
            {{ t('请输入 DELETE 确认：', 'Please type DELETE to confirm:') }}
          </label>
          <input class="qc-edit-input" type="text" [(ngModel)]="clearConfirmInput"
            (keydown.enter)="doClearData()" placeholder="DELETE" #clearInput
            style="margin-top:6px; width:100%; box-sizing:border-box;" />
        </div>
        <div class="qc-edit-footer">
          <button class="qs-btn" (click)="closeClearConfirm()">{{ t('取消', 'Cancel') }}</button>
          <button class="qs-btn qs-btn-danger" (click)="doClearData()"
            [style.opacity]="clearConfirmInput !== 'DELETE' ? '0.5' : '1'"
            [disabled]="clearConfirmInput !== 'DELETE'">{{ t('清空', 'Clear') }}</button>
        </div>
      </div>
    </div>
  `,
        styles: [`
    .qc-settings-page { padding:20px; max-width:600px; }
    .qs-title { color:var(--primary-color,#3b82f6); font-size:18px; margin-bottom:6px; }
    .qs-desc { opacity:.7; font-size:13px; line-height:1.6; margin-bottom:24px; }
    .qs-section { border-top:1px solid rgba(128,128,128,0.2); padding-top:16px; margin-bottom:16px; }
    .qs-section-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
    .qs-label { display:block; font-size:16px; font-weight:600; margin-bottom:10px; }
    .qs-select {
      width:100%; max-width:280px;
      padding:7px 10px; border-radius:6px;
      background: rgba(128,128,128,0.1);
      border:1px solid rgba(128,128,128,0.25);
      font-size:13px; cursor:pointer; outline:none;
      color: inherit;
    }
    .qs-select option { color: #000; background: #fff; }
    .qs-select:focus { border-color: var(--primary-color, #3b82f6); }
    .qs-hint { opacity:.6; font-size:11px; line-height:1.5; margin-top:6px; }

    /* 颜色主题 */
    .qs-color-row { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px; }
    .qs-color-swatch {
      display:inline-flex; flex-direction:column; align-items:center; gap:6px;
      padding:10px; border-radius:12px; border:2px solid transparent;
      font-size:12px; font-weight:500; cursor:pointer; transition:all .18s;
      min-width:80px;
    }
    .qs-color-swatch:hover { opacity:.85; transform:translateY(-1px); }
    .qs-color-active { border-color: var(--primary-color,#3b82f6) !important; box-shadow:0 0 0 3px rgba(59,130,246,.2); }
    .qs-color-swatch-name { font-size:11px; font-weight:600; }
    .qs-color-swatch-preview {
      display:flex; flex-direction:column; border-radius:8px; overflow:hidden;
      width:72px;
    }
    .qs-cp-title { display:block; padding:4px 6px; font-size:8px; font-weight:600; line-height:1.4; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .qs-cp-body { display:block; padding:4px 6px; font-size:8px; font-family:monospace; min-height:18px; }
    .qs-cp-line { display:block; line-height:1.4; }
    .qs-cp-accent { display:inline-block; width:12px; height:3px; border-radius:2px; margin-top:2px; }
    /* 玻璃预览卡片 */
    .qs-glass-preview {
      width:240px; margin:0 auto 16px;
      border-radius:12px; overflow:hidden;
      padding:0;
    }
    .qs-gp-titlebar {
      display:flex; align-items:center; gap:6px;
      padding:8px 12px;
    }
    .qs-gp-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
    .qs-gp-title { font-size:11px; font-weight:600; }
    .qs-gp-body { padding:10px 14px; }
    .qs-gp-cmd { display:block; font-size:11px; font-family:monospace; line-height:1.6; }
    .qs-color-fields { display:flex; gap:16px; flex-wrap:wrap; align-items:flex-start; margin-top:8px; }
    .qs-color-field { display:flex; flex-direction:column; gap:3px; }
    .qs-color-field label { font-size:12px; font-weight:500; }
    .qs-color-input { width:44px; height:30px; border:none; border-radius:6px; cursor:pointer; }
    .qs-color-val { font-size:11px; font-family:monospace; opacity:.6; }

    /* 命令列表 */
    .qs-empty { padding:24px; text-align:center; opacity:.5; font-size:13px; }
    .qs-cmd-item { padding:10px; margin-bottom:8px; border:1px solid rgba(128,128,128,0.2); border-radius:8px; }
    .qs-cmd-top { display:flex; align-items:center; gap:8px; }
    .qs-cmd-info { display:flex; align-items:center; gap:6px; flex-wrap:wrap; flex:1; min-width:0; }
    .qs-cmd-name { font-weight:500; font-size:14px; flex-shrink:0; }
    .qs-cmd-badge { background: var(--primary-color,#3b82f6); color:#fff; padding:1px 8px; border-radius:10px; font-size:11px; flex-shrink:0; }
    .qs-cmd-shortcut { background: rgba(128,128,128,0.15); padding:1px 6px; border-radius:4px; font-size:11px; font-family:monospace; flex-shrink:0; }
    .qs-cmd-text { background: rgba(128,128,128,0.08); padding:6px 10px; border-radius:4px; font-family:monospace; font-size:12px; white-space:pre-wrap; margin:6px 0 0; overflow-x:auto; }
    .qs-cmd-text-inline { font-family:monospace; font-size:11px; opacity:.55; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:60px; flex:1; cursor:default; }
    .qs-cmd-actions { display:flex; gap:4px; flex-shrink:0; }
    .qs-btn-xs { padding:2px 8px; border-radius:4px; border:1px solid rgba(128,128,128,0.2); background:rgba(128,128,128,0.06); font-size:11px; cursor:pointer; color:inherit; line-height:1.4; }
    .qs-btn-xs:hover { background: rgba(128,128,128,0.15); }
    .qs-btn-xs-danger { border-color:#e24b4a; color:#e24b4a; }
    .qs-btn-xs-danger:hover { background: rgba(226,75,74,0.1); }

    /* 分组 */
    .qs-group-item { display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid rgba(128,128,128,0.1); font-size:13px; }
    .qs-group-actions { display:flex; gap:6px; }

    /* 按钮 */
    .qs-btn {
      display:inline-flex; align-items:center; gap:6px;
      padding:6px 16px; border-radius:8px;
      border:1px solid rgba(128,128,128,0.25);
      background: rgba(128,128,128,0.08);
      font-size:13px; cursor:pointer; transition:background .15s;
      color: inherit;
    }
    .qs-btn:hover { background: rgba(128,128,128,0.15); }
    .qs-btn-primary { background: var(--primary-color,#3b82f6); color:#fff; border-color:var(--primary-color,#3b82f6); }
    .qs-btn-primary:hover { opacity:.85; }
    .qs-btn-danger { border-color:#e24b4a; color:#e24b4a; }
    .qs-btn-danger:hover { background: rgba(226,75,74,0.1); }
    .qs-btn-sm { padding:4px 12px; border-radius:6px; border:1px solid rgba(128,128,128,0.25); background: rgba(128,128,128,0.08); font-size:12px; cursor:pointer; color: inherit; }
    .qs-btn-sm:hover { background: rgba(128,128,128,0.15); }
    .qs-btn-sm-danger { border-color:#e24b4a; color:#e24b4a; }
    .qs-btn-sm-danger:hover { background: rgba(226,75,74,0.1); }
    .qs-btn-import { cursor:pointer; }
    .qs-backup-row { display:flex; gap:10px; flex-wrap:wrap; margin-top:4px; }

    /* 入口模式选择 */
    .qs-entry-mode-row { margin-top:8px; display:flex; flex-direction:column; gap:4px; }
    .qs-entry-mode-options { display:flex; gap:8px; }
    .qs-entry-mode-option {
      display:flex; align-items:center; gap:4px;
      padding:6px 12px; border-radius:6px;
      border:0.5px solid var(--_border,#585b70);
      cursor:pointer; transition:all .15s;
      user-select:none;
    }
    .qs-entry-mode-option:hover { border-color:var(--_primary,#b4befe); }
    .qs-entry-mode-active { border-color:var(--_primary,#b4befe); background:rgba(180,190,254,0.08); }
    .qs-entry-mode-option input { margin:0; }

    /* 字体大小 */
    .qs-font-row { margin-top:12px; display:flex; flex-direction:column; gap:4px; }
    .qs-font-label { font-size:13px; font-weight:500; }
    .qs-font-control { display:flex; align-items:center; gap:10px; }
    .qs-font-val { font-size:13px; min-width:30px; color:var(--_text-muted); font-variant-numeric:tabular-nums; }

    /* range 滑块 */
    .qs-range { flex:1; max-width:160px; margin:0; height:4px; -webkit-appearance:none; appearance:none; background:var(--_border,#585b70); border-radius:2px; outline:none; cursor:pointer; }
    .qs-range::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:14px; height:14px; border-radius:50%; background:var(--_primary,#b4befe); border:2px solid var(--_surface,#45475a); cursor:pointer; }
    .qs-range::-moz-range-track { height:4px; background:var(--_border,#585b70); border-radius:2px; }
    .qs-range::-moz-range-thumb { width:14px; height:14px; border-radius:50%; background:var(--_primary,#b4befe); border:2px solid var(--_surface,#45475a); cursor:pointer; }

    /* 关于 */
    .qs-about-row { display:flex; gap:16px; flex-wrap:wrap; margin-top:4px; font-size:13px; }
    .qs-about-item { color:var(--_text-muted); }
    .qs-about-link { color:var(--_primary,#b4befe); text-decoration:none; cursor:pointer; }
    .qs-about-link:hover { text-decoration:underline; }
    .qs-about-link svg { width:12px; height:12px; vertical-align:middle; margin-right:2px; }

    /* 确认弹窗 */
    .qc-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:100000; display:flex; align-items:center; justify-content:center; }
    .qc-edit-modal {
      background:var(--_bg,#313244); border:0; border-radius:12px; padding:20px; z-index:100001;
      min-width:380px; max-width:90%;
      color:var(--_text,#cdd6f4);
    }
    .qc-edit-title { font-size:16px; font-weight:600; margin-bottom:16px; }
    .qc-edit-field { margin-bottom:16px; }
    .qc-edit-input {
      width:100%; padding:8px 12px; border-radius:6px;
      border:1px solid rgba(128,128,128,0.3);
      background:rgba(0,0,0,0.2); color:inherit; font-size:13px; outline:none;
      box-sizing:border-box;
    }
    .qc-edit-input:focus { border-color:var(--primary-color,#3b82f6); }
    .qc-edit-footer { display:flex; gap:8px; justify-content:flex-end; margin-top:10px; }
  `],
    }),
    __metadata("design:paramtypes", [])
], QuickCommandSettingsComponent);

let QuickCommandSettingsTabProvider = class QuickCommandSettingsTabProvider extends tabby_settings__WEBPACK_IMPORTED_MODULE_1__.SettingsTabProvider {
    constructor() {
        super(...arguments);
        this.id = 'qc-settings';
        this.icon = 'fas fa-terminal';
        this.title = 'QuickCmd+';
    }
    getComponentType() {
        return QuickCommandSettingsComponent;
    }
    async getSettingsTabs() {
        return [{
                title: 'QuickCmd+',
                icon: 'fas fa-terminal',
                weight: 99,
                component: QuickCommandSettingsComponent,
            }];
    }
};
QuickCommandSettingsTabProvider = __decorate([
    (0,_angular_core__WEBPACK_IMPORTED_MODULE_0__.Injectable)()
], QuickCommandSettingsTabProvider);



/***/ },

/***/ "./src/qc-terminal-decorator.ts"
/*!**************************************!*\
  !*** ./src/qc-terminal-decorator.ts ***!
  \**************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   QuickCommandTerminalDecorator: () => (/* binding */ QuickCommandTerminalDecorator)
/* harmony export */ });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "@angular/core");
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_angular_core__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var tabby_terminal__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! tabby-terminal */ "tabby-terminal");
/* harmony import */ var tabby_terminal__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(tabby_terminal__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _qc_floating_panel_component__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./qc-floating-panel.component */ "./src/qc-floating-panel.component.ts");
/* harmony import */ var _qc_command_service__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./qc-command.service */ "./src/qc-command.service.ts");
/* harmony import */ var _qc_i18n_service__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./qc-i18n.service */ "./src/qc-i18n.service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var QuickCommandTerminalDecorator_1;
/**
 * QuickCommand+ 终端装饰器
 * 功能描述：在终端注入入口按钮（浮动或工具栏），管理浮动面板的创建/销毁/最小化/恢复
 *   面板直接作为 hostEl 的子元素（无覆盖层），根据入口按钮位置自动选择最佳显示方位
 *   支持两种入口模式：拖拽浮动入口 / 工具栏按钮（类似 SFTP+）
 * 创建人：iishen717
 * 创建时间：2026-06-26
 * 修改人：iishen717
 * 修改时间：2026-06-28
 *   新增工具栏按钮入口模式，通过 qc-plus-entry-mode localStorage 控制
 */





let QuickCommandTerminalDecorator = QuickCommandTerminalDecorator_1 = class QuickCommandTerminalDecorator extends tabby_terminal__WEBPACK_IMPORTED_MODULE_1__.TerminalDecorator {
    constructor(resolver, appRef, zone, injector) {
        super();
        this.resolver = resolver;
        this.appRef = appRef;
        this.zone = zone;
        this.injector = injector;
        // 确保颜色主题已应用（面板创建前就设置好 CSS 变量）
        this.applySavedTheme();
        console.log('[QC+] Decorator ready');
    }
    applySavedTheme() {
        try {
            // 先应用字体大小（不依赖主题设置）
            const root = document.documentElement;
            const savedFontSize = localStorage.getItem('qc-plus-font-size');
            if (savedFontSize && !root.style.getPropertyValue('--qc-font-size')) {
                root.style.setProperty('--qc-font-size', savedFontSize + 'px');
            }
            // 如果是 Auto 模式（theme 为空），不做颜色设置
            const theme = localStorage.getItem('qc-plus-theme');
            if (!theme || theme === '')
                return;
            const keys = ['primary', 'bg', 'text', 'border', 'surface', 'hover', 'input-bg', 'text-muted'];
            let applied = false;
            for (const k of keys) {
                const val = localStorage.getItem(`qc-plus-color-${k}`);
                if (val && !root.style.getPropertyValue(`--qc-${k}`)) {
                    root.style.setProperty(`--qc-${k}`, val);
                    applied = true;
                }
            }
            if (applied)
                console.log('[QC+] Color theme applied');
        }
        catch ( /* ignore */_a) { /* ignore */ }
    }
    attach(terminal) {
        super.attach(terminal);
        console.log('[QC+] attach called');
        const entryI18n = new _qc_i18n_service__WEBPACK_IMPORTED_MODULE_4__.QuickCommandI18nService();
        const qcSvc = new _qc_command_service__WEBPACK_IMPORTED_MODULE_3__.QuickCommandService();
        const tryInsert = () => {
            var _a, _b, _c, _d;
            try {
                const hostEl = (_a = terminal === null || terminal === void 0 ? void 0 : terminal.element) === null || _a === void 0 ? void 0 : _a.nativeElement;
                if (!hostEl)
                    return false;
                if (hostEl.querySelector('[data-qc-entry="1"]'))
                    return true;
                // 获取终端标识（SSH 会话或 profile ID）
                const ssh = (_c = (_b = terminal === null || terminal === void 0 ? void 0 : terminal.sshSession) !== null && _b !== void 0 ? _b : terminal === null || terminal === void 0 ? void 0 : terminal._session) !== null && _c !== void 0 ? _c : null;
                let profileId = ((_d = terminal === null || terminal === void 0 ? void 0 : terminal.profile) === null || _d === void 0 ? void 0 : _d.id) || '';
                if (!profileId && (ssh === null || ssh === void 0 ? void 0 : ssh.host)) {
                    profileId = 'ssh:' + ssh.host;
                }
                this.buildEntry(hostEl, terminal, ssh, profileId, entryI18n, qcSvc);
                this.listenEntryModeChange(hostEl);
                console.log('[QC+] Entry button injected');
                return true;
            }
            catch (err) {
                console.warn('[QC+] tryInsert error', err);
                return false;
            }
        };
        let attempts = 0;
        const timer = setInterval(() => {
            attempts++;
            if (tryInsert() || attempts > 20) {
                clearInterval(timer);
                if (attempts > 20)
                    console.log('[QC+] No terminal found after 20 attempts');
            }
        }, 500);
        this.subscribeUntilDetached(terminal, { unsubscribe: () => clearInterval(timer) });
    }
    /** 根据当前入口模式构建入口 */
    buildEntry(hostEl, terminal, ssh, profileId, i18n, qcSvc) {
        const entryMode = qcSvc.getEntryMode();
        let entry;
        if (entryMode === 'toolbar') {
            entry = this.createToolbarEntry(hostEl, i18n);
        }
        else {
            entry = this.createFloatingEntry(hostEl, qcSvc, profileId, i18n);
            this.setupFloatingDrag(entry, hostEl, qcSvc, profileId);
        }
        if (!entry)
            return;
        entry.setAttribute('data-qc-entry', '1');
        this.setupEntryClick(entry, hostEl, terminal, i18n, entryMode);
        hostEl.__qcEntry = entry;
        hostEl.__qcTerminal = terminal;
        hostEl.__qcProfileId = profileId;
        this.setupSSHDisconnect(entry, terminal, ssh, i18n);
    }
    /** 监听入口模式切换，即时重建 */
    listenEntryModeChange(hostEl) {
        if (hostEl.__qcModeListener)
            return;
        const rebuild = () => {
            var _a, _b, _c;
            // 清除旧入口
            const oldEntry = hostEl.__qcEntry;
            if (oldEntry) {
                oldEntry.remove();
                delete hostEl.__qcEntry;
            }
            // 关闭面板
            if (hostEl.__qcPanelOpen)
                this.closePanel(hostEl);
            // 重建
            const terminal = hostEl.__qcTerminal;
            const ssh = (_b = (_a = terminal === null || terminal === void 0 ? void 0 : terminal.sshSession) !== null && _a !== void 0 ? _a : terminal === null || terminal === void 0 ? void 0 : terminal._session) !== null && _b !== void 0 ? _b : null;
            let profileId = ((_c = terminal === null || terminal === void 0 ? void 0 : terminal.profile) === null || _c === void 0 ? void 0 : _c.id) || '';
            if (!profileId && (ssh === null || ssh === void 0 ? void 0 : ssh.host))
                profileId = 'ssh:' + ssh.host;
            this.buildEntry(hostEl, terminal, ssh, profileId, new _qc_i18n_service__WEBPACK_IMPORTED_MODULE_4__.QuickCommandI18nService(), new _qc_command_service__WEBPACK_IMPORTED_MODULE_3__.QuickCommandService());
        };
        // 三通道触发重建
        window.addEventListener('qc-plus-entry-mode-changed', rebuild);
        hostEl.addEventListener('qc-mode-change', rebuild);
        QuickCommandTerminalDecorator_1.rebuildRegistry.add(rebuild);
        hostEl.__qcModeListener = true;
        hostEl.__qcRebuildFn = rebuild;
        // 终端分离时自动清理监听器
        const terminal = hostEl.__qcTerminal;
        if (terminal) {
            this.subscribeUntilDetached(terminal, {
                unsubscribe: () => {
                    window.removeEventListener('qc-plus-entry-mode-changed', rebuild);
                    hostEl.removeEventListener('qc-mode-change', rebuild);
                    QuickCommandTerminalDecorator_1.rebuildRegistry.delete(rebuild);
                    delete hostEl.__qcModeListener;
                    delete hostEl.__qcRebuildFn;
                }
            });
        }
    }
    /** 供设置面板直接调用的全局重建入口 */
    static rebuildAll() {
        for (const fn of QuickCommandTerminalDecorator_1.rebuildRegistry) {
            try {
                fn();
            }
            catch (_a) { }
        }
    }
    /** 创建浮动入口（可拖拽） */
    createFloatingEntry(hostEl, qcSvc, profileId, i18n) {
        const entry = document.createElement('div');
        entry.style.cssText = `
      position: absolute; z-index: 99997;
      cursor: move; user-select: none;
      display: flex; align-items: center; gap: 4px;
      padding: 3px 8px; border-radius: 6px;
      background: var(--qc-surface, #45475a);
      border: 0.5px solid var(--qc-primary, #b4befe);
      font-size: var(--qc-font-size, 12px); color: var(--qc-primary, #b4befe);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.4;
      pointer-events: auto;
      transition: opacity 0.2s;
      opacity: 0.85;
    `;
        entry.title = i18n.t('entry.title');
        entry.innerHTML = '&gt;_&nbsp;QC+ <span style="color:var(--qc-text-muted,#6c7086);font-size:calc(var(--qc-font-size,14px) - 1px);">&#x22EE;&#x22EE;</span>';
        // 位置恢复
        const mem = profileId ? qcSvc.getPositionMemory(profileId) : null;
        if (mem) {
            entry.style.left = mem.entryX + 'px';
            entry.style.top = mem.entryY + 'px';
        }
        else {
            const savedPos = qcSvc.getEntryPosition();
            const isDefault = savedPos.x === 20 && savedPos.y === 60;
            if (isDefault) {
                entry.style.top = '60px';
                entry.style.right = '16px';
            }
            else {
                entry.style.left = savedPos.x + 'px';
                entry.style.top = savedPos.y + 'px';
            }
        }
        entry.addEventListener('mouseenter', () => { entry.style.opacity = '1'; });
        entry.addEventListener('mouseleave', () => { entry.style.opacity = '0.85'; });
        hostEl.style.position = 'relative';
        hostEl.appendChild(entry);
        return entry;
    }
    /** 创建工具栏按钮入口（类似 SFTP+） */
    createToolbarEntry(hostEl, i18n) {
        var _a, _b;
        // 查找工具栏容器（兼容多种 Tabby 版本）
        const toolbar = (_b = (_a = hostEl.querySelector('.terminal-toolbar')) !== null && _a !== void 0 ? _a : hostEl.querySelector('terminal-toolbar')) !== null && _b !== void 0 ? _b : hostEl.querySelector('.btn-toolbar');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-sm btn-link me-2';
        btn.setAttribute('data-qc-entry', '1');
        btn.innerHTML = '&gt;_&nbsp;QC+';
        btn.title = i18n.t('entry.title');
        btn.style.pointerEvents = 'auto';
        if (toolbar) {
            // 有工具栏 → 作为工具栏按钮插入
            btn.style.position = 'relative';
            btn.style.zIndex = '10';
            const allButtons = Array.from(toolbar.querySelectorAll('button'));
            const reconnectButton = allButtons.find(b => { var _a, _b; return /reconnect|переподключ/i.test(`${(_a = b.textContent) !== null && _a !== void 0 ? _a : ''} ${(_b = b.title) !== null && _b !== void 0 ? _b : ''}`); });
            if (reconnectButton === null || reconnectButton === void 0 ? void 0 : reconnectButton.parentElement) {
                reconnectButton.parentElement.insertBefore(btn, reconnectButton.nextSibling);
            }
            else {
                toolbar.appendChild(btn);
            }
        }
        else {
            hostEl.style.position = 'relative';
            // 无工具栏时放入共享 flex 容器，两个插件自然并排
            let container = hostEl.querySelector('[data-plugin-btns]');
            if (!container) {
                container = document.createElement('div');
                container.setAttribute('data-plugin-btns', '1');
                container.style.cssText = 'position:absolute;top:8px;right:8px;z-index:99997;display:flex;gap:4px;';
                hostEl.appendChild(container);
            }
            btn.style.position = 'static';
            btn.style.border = '0.5px solid var(--qc-primary, #b4befe)';
            btn.style.borderRadius = '6px';
            btn.style.padding = '3px 8px';
            btn.style.background = 'var(--qc-surface, #45475a)';
            btn.style.color = 'var(--qc-primary, #b4befe)';
            btn.style.fontSize = 'var(--qc-font-size, 12px)';
            btn.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
            btn.style.lineHeight = '1.4';
            btn.style.cursor = 'pointer';
            btn.style.opacity = '0.85';
            btn.style.transition = 'opacity 0.2s';
            btn.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
            btn.addEventListener('mouseleave', () => { btn.style.opacity = '0.85'; });
            container.appendChild(btn);
        }
        return btn;
    }
    /** 浮动入口拖拽逻辑 */
    setupFloatingDrag(entry, hostEl, qcSvc, profileId) {
        entry.__qcWasDrag = false;
        entry.addEventListener('mousedown', (ev) => {
            ev.stopPropagation();
            entry.__qcWasDrag = false;
        });
        let dragging = false;
        let offsetX = 0, offsetY = 0;
        let entryStartX = 0, entryStartY = 0;
        entry.addEventListener('mousedown', (ev) => {
            if (ev.button !== 0)
                return;
            const rect = entry.getBoundingClientRect();
            const hr = hostEl.getBoundingClientRect();
            offsetX = ev.clientX - rect.left;
            offsetY = ev.clientY - rect.top;
            entryStartX = ev.clientX;
            entryStartY = ev.clientY;
            dragging = false;
            const onMove = (me) => {
                me.preventDefault();
                if (Math.abs(me.clientX - entryStartX) > 4 || Math.abs(me.clientY - entryStartY) > 4) {
                    dragging = true;
                    entry.__qcWasDrag = true;
                }
                if (!dragging)
                    return;
                let nl = me.clientX - hr.left - offsetX;
                let nt = me.clientY - hr.top - offsetY;
                const ew = entry.offsetWidth, eh = entry.offsetHeight;
                nl = Math.max(0, Math.min(nl, hostEl.clientWidth - ew));
                nt = Math.max(0, Math.min(nt, hostEl.clientHeight - eh));
                entry.style.top = nt + 'px';
                entry.style.right = 'auto';
                entry.style.left = nl + 'px';
                me.stopPropagation();
            };
            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                if (dragging) {
                    const x = parseInt(entry.style.left) || 0;
                    const y = parseInt(entry.style.top) || 0;
                    if (profileId && qcSvc.hasPositionMemory(profileId)) {
                        qcSvc.savePositionMemory(profileId, { entryX: x, entryY: y });
                    }
                    else {
                        qcSvc.saveEntryPosition({ x, y });
                    }
                }
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    }
    /** 共享点击处理：打开/切换面板 */
    setupEntryClick(entry, hostEl, terminal, i18n, entryMode) {
        const isButton = entry.tagName === 'BUTTON';
        entry.addEventListener('click', (ev) => {
            var _a, _b;
            ev.preventDefault();
            ev.stopPropagation();
            // 拖拽后不触发面板（仅浮动入口有拖拽）
            if (entry.__qcWasDrag) {
                ;
                entry.__qcWasDrag = false;
                return;
            }
            const ssh = (_b = (_a = terminal === null || terminal === void 0 ? void 0 : terminal.sshSession) !== null && _a !== void 0 ? _a : terminal === null || terminal === void 0 ? void 0 : terminal._session) !== null && _b !== void 0 ? _b : null;
            if (ssh && (ssh.open === false || ssh.closed)) {
                entry.style.opacity = '0.3';
                if (isButton)
                    entry.disabled = true;
                entry.title = i18n.t('entry.disconnected');
                return;
            }
            this.togglePanel(hostEl);
        });
    }
    /** 共享 SSH 断开检测 */
    setupSSHDisconnect(entry, terminal, ssh, i18n) {
        var _a;
        if (!ssh)
            return;
        const isButton = entry.tagName === 'BUTTON';
        const markDisconnected = () => {
            entry.style.opacity = '0.3';
            entry.style.cursor = 'not-allowed';
            if (isButton)
                entry.disabled = true;
            entry.title = i18n.t('entry.disconnected');
        };
        try {
            if (ssh === null || ssh === void 0 ? void 0 : ssh.closed$) {
                const sub = ssh.closed$.subscribe(markDisconnected);
                this.subscribeUntilDetached(terminal, { unsubscribe: () => { try {
                        sub.unsubscribe();
                    }
                    catch (_a) { } } });
            }
            else if (typeof ((_a = ssh === null || ssh === void 0 ? void 0 : ssh.closed) === null || _a === void 0 ? void 0 : _a.then) === 'function') {
                ssh.closed.then(markDisconnected).catch(() => { });
            }
        }
        catch ( /* ignore */_b) { /* ignore */ }
    }
    togglePanel(hostEl) {
        if (hostEl.__qcPanelOpen && hostEl.__qcMinimized) {
            this.restorePanel(hostEl);
            return;
        }
        if (hostEl.__qcPanelOpen) {
            this.closePanel(hostEl);
            return;
        }
        this.zone.run(() => {
            try {
                // 直接挂到 hostEl 下（无覆盖层）
                const panelHost = document.createElement('div');
                panelHost.setAttribute('data-qc-panel-host', '1');
                hostEl.appendChild(panelHost);
                hostEl.__qcPanelHost = panelHost;
                hostEl.__qcPanelOpen = true;
                hostEl.__qcMinimized = false;
                const factory = this.resolver.resolveComponentFactory(_qc_floating_panel_component__WEBPACK_IMPORTED_MODULE_2__.QuickCommandFloatingPanel);
                const cmpRef = factory.create(this.injector, [], panelHost);
                const cmp = cmpRef.instance;
                hostEl.__qcCmpRef = cmpRef;
                cmp.terminalRef = hostEl.__qcTerminal;
                cmp.profileId = hostEl.__qcProfileId || '';
                // 根据入口按钮位置计算面板最佳位置
                this.positionPanelNearEntry(hostEl, cmp);
                cmp.onClose = () => {
                    this.zone.run(() => { this.closePanel(hostEl); });
                };
                cmp.onMinimize = () => {
                    this.zone.run(() => {
                        const ph = hostEl.__qcPanelHost;
                        if (ph)
                            ph.style.display = 'none';
                        hostEl.__qcMinimized = true;
                        cmp.minimized = true;
                    });
                };
                // 面板切换：入口隐藏时按下ESC或其他方式关闭入口时也关闭面板
                this.appRef.attachView(cmpRef.hostView);
                cmpRef.changeDetectorRef.detectChanges();
                // 确保 terminalRef/profileId 已就绪后应用位置记忆
                cmp.applyPositionMemory();
                // 再次触发变更检测确保 filterGroup 等状态正确渲染
                cmpRef.changeDetectorRef.detectChanges();
                // 阻止面板区域内鼠标事件冒泡到终端
                panelHost.addEventListener('mousedown', (ev) => ev.stopPropagation());
                panelHost.addEventListener('click', (ev) => ev.stopPropagation());
                console.log('[QC+] Panel opened');
            }
            catch (e) {
                console.error('[QC+] Panel error', e);
            }
        });
    }
    /**
     * 根据入口按钮位置，自动选择面板的最佳显示方位
     * 使用 getBoundingClientRect 确保位置精确
     * 面板尺寸 320x420，紧贴按钮旁展开，避免超出边界
     */
    positionPanelNearEntry(hostEl, cmp) {
        const entry = hostEl.__qcEntry;
        if (!entry)
            return;
        const hostRect = hostEl.getBoundingClientRect();
        const entryRect = entry.getBoundingClientRect();
        // 入口相对于 hostEl 的位置
        const entryLeft = entryRect.left - hostRect.left;
        const entryTop = entryRect.top - hostRect.top;
        const entryW = entryRect.width;
        const entryH = entryRect.height;
        const hostW = hostEl.clientWidth;
        const hostH = hostEl.clientHeight;
        const panelW = 320;
        const panelH = 420;
        const gap = 4;
        let px, py;
        // 水平：按钮在哪侧，面板就贴在哪侧
        if (entryLeft + entryW / 2 < hostW / 2) {
            px = entryLeft + entryW + gap; // 按钮右侧
        }
        else {
            px = entryLeft - panelW - gap; // 按钮左侧
        }
        // 垂直：按钮在哪侧，面板就贴在哪侧
        if (entryTop + entryH / 2 < hostH / 2) {
            py = entryTop; // 按钮下方
        }
        else {
            py = entryTop - panelH + entryH; // 按钮上方
        }
        // 边界约束
        px = Math.max(4, Math.min(px, hostW - panelW - 4));
        py = Math.max(4, Math.min(py, hostH - panelH - 4));
        cmp.panelX = Math.round(px);
        cmp.panelY = Math.round(py);
    }
    closePanel(hostEl) {
        try {
            const cmpRef = hostEl.__qcCmpRef;
            if (cmpRef) {
                try {
                    cmpRef.destroy();
                }
                catch (_a) { }
            }
            const ph = hostEl.__qcPanelHost;
            if (ph) {
                try {
                    ph.remove();
                }
                catch (_b) { }
            }
        }
        catch (_c) { }
        delete hostEl.__qcPanelOpen;
        delete hostEl.__qcMinimized;
        delete hostEl.__qcPanelHost;
        delete hostEl.__qcCmpRef;
    }
    restorePanel(hostEl) {
        const ph = hostEl.__qcPanelHost;
        const cmpRef = hostEl.__qcCmpRef;
        if (ph) {
            ph.style.display = '';
            hostEl.__qcMinimized = false;
            if (cmpRef === null || cmpRef === void 0 ? void 0 : cmpRef.instance) {
                cmpRef.instance.minimized = false;
                // 恢复时重新定位
                this.positionPanelNearEntry(hostEl, cmpRef.instance);
            }
        }
    }
    /** 静态方法：在无终端的情况下独立弹出快捷命令面板（用于首页按钮） */
    static openStandalonePanel(injector) {
        if (document.querySelector('[data-qc-standalone]'))
            return;
        const resolver = injector.get(_angular_core__WEBPACK_IMPORTED_MODULE_0__.ComponentFactoryResolver);
        const appRef = injector.get(_angular_core__WEBPACK_IMPORTED_MODULE_0__.ApplicationRef);
        const zone = injector.get(_angular_core__WEBPACK_IMPORTED_MODULE_0__.NgZone);
        zone.run(() => {
            try {
                const backdrop = document.createElement('div');
                backdrop.setAttribute('data-qc-standalone', 'backdrop');
                backdrop.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.35);';
                backdrop.addEventListener('click', () => {
                    QuickCommandTerminalDecorator_1.closeStandalonePanel();
                });
                document.body.appendChild(backdrop);
                const panelHost = document.createElement('div');
                panelHost.setAttribute('data-qc-standalone', 'panel');
                panelHost.style.cssText = 'position:fixed;z-index:99999;';
                document.body.appendChild(panelHost);
                const factory = resolver.resolveComponentFactory(_qc_floating_panel_component__WEBPACK_IMPORTED_MODULE_2__.QuickCommandFloatingPanel);
                const cmpRef = factory.create(injector, [], panelHost);
                const cmp = cmpRef.instance;
                cmp.panelX = Math.round((window.innerWidth - 340) / 2);
                cmp.panelY = Math.round((window.innerHeight - 420) / 2);
                cmp.terminalRef = null;
                cmp.profileId = '';
                cmp.onClose = () => {
                    QuickCommandTerminalDecorator_1.closeStandalonePanel();
                };
                appRef.attachView(cmpRef.hostView);
                cmpRef.changeDetectorRef.detectChanges();
                panelHost.addEventListener('mousedown', (ev) => ev.stopPropagation());
                panelHost.addEventListener('click', (ev) => ev.stopPropagation());
                console.log('[QC+] Standalone panel opened');
            }
            catch (e) {
                console.error('[QC+] Standalone panel error', e);
            }
        });
    }
    static closeStandalonePanel() {
        try {
            document.querySelectorAll('[data-qc-standalone="backdrop"]').forEach(b => b.remove());
            document.querySelectorAll('[data-qc-standalone="panel"]').forEach(p => p.remove());
        }
        catch (_a) { }
    }
};
/** 所有活跃终端入口的 rebuild 回调，供设置面板直接触发 */
QuickCommandTerminalDecorator.rebuildRegistry = new Set();
QuickCommandTerminalDecorator = QuickCommandTerminalDecorator_1 = __decorate([
    (0,_angular_core__WEBPACK_IMPORTED_MODULE_0__.Injectable)(),
    __metadata("design:paramtypes", [_angular_core__WEBPACK_IMPORTED_MODULE_0__.ComponentFactoryResolver,
        _angular_core__WEBPACK_IMPORTED_MODULE_0__.ApplicationRef,
        _angular_core__WEBPACK_IMPORTED_MODULE_0__.NgZone,
        _angular_core__WEBPACK_IMPORTED_MODULE_0__.Injector])
], QuickCommandTerminalDecorator);

/* 全局回调：由设置面板 onEntryModeChange 触发重建 */
;
window.__qcRebuildEntry = () => QuickCommandTerminalDecorator.rebuildAll();


/***/ },

/***/ "@angular/common"
/*!**********************************!*\
  !*** external "@angular/common" ***!
  \**********************************/
(module) {

module.exports = require("@angular/common");

/***/ },

/***/ "@angular/core"
/*!********************************!*\
  !*** external "@angular/core" ***!
  \********************************/
(module) {

module.exports = require("@angular/core");

/***/ },

/***/ "@angular/forms"
/*!*********************************!*\
  !*** external "@angular/forms" ***!
  \*********************************/
(module) {

module.exports = require("@angular/forms");

/***/ },

/***/ "tabby-core"
/*!*****************************!*\
  !*** external "tabby-core" ***!
  \*****************************/
(module) {

module.exports = require("tabby-core");

/***/ },

/***/ "tabby-settings"
/*!*********************************!*\
  !*** external "tabby-settings" ***!
  \*********************************/
(module) {

module.exports = require("tabby-settings");

/***/ },

/***/ "tabby-terminal"
/*!*********************************!*\
  !*** external "tabby-terminal" ***!
  \*********************************/
(module) {

module.exports = require("tabby-terminal");

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	const __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		const cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		const module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		if (!(moduleId in __webpack_modules__)) {
/******/ 			delete __webpack_module_cache__[moduleId];
/******/ 			const e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			const getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter/value functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			if(Array.isArray(definition)) {
/******/ 				var i = 0;
/******/ 				while(i < definition.length) {
/******/ 					var key = definition[i++];
/******/ 					var binding = definition[i++];
/******/ 					if(!__webpack_require__.o(exports, key)) {
/******/ 						if(binding === 0) {
/******/ 							Object.defineProperty(exports, key, { enumerable: true, value: definition[i++] });
/******/ 						} else {
/******/ 							Object.defineProperty(exports, key, { enumerable: true, get: binding });
/******/ 						}
/******/ 					} else if(binding === 0) { i++; }
/******/ 				}
/******/ 			} else {
/******/ 				for(var key in definition) {
/******/ 					if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 						Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 					}
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
let __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   QuickCmdStartPageButtonProvider: () => (/* binding */ QuickCmdStartPageButtonProvider),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _angular_common__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/common */ "@angular/common");
/* harmony import */ var _angular_common__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_angular_common__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _angular_forms__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/forms */ "@angular/forms");
/* harmony import */ var _angular_forms__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_angular_forms__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/core */ "@angular/core");
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_angular_core__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var tabby_core__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! tabby-core */ "tabby-core");
/* harmony import */ var tabby_core__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(tabby_core__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var tabby_settings__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! tabby-settings */ "tabby-settings");
/* harmony import */ var tabby_settings__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(tabby_settings__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var tabby_terminal__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! tabby-terminal */ "tabby-terminal");
/* harmony import */ var tabby_terminal__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(tabby_terminal__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _qc_terminal_decorator__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./qc-terminal-decorator */ "./src/qc-terminal-decorator.ts");
/* harmony import */ var _qc_floating_panel_component__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./qc-floating-panel.component */ "./src/qc-floating-panel.component.ts");
/* harmony import */ var _qc_settings_component__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./qc-settings.component */ "./src/qc-settings.component.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
/**
 * QuickCommand+ 插件入口
 * 功能描述：注册 TerminalDecorator（浮动入口）+ 浮动面板 + 设置页
 * 创建人：iishen717
 * 创建时间：2026-06-26
 * 修改人：iishen717
 * 修改时间：2026-06-27
 *   模块启动时自动应用已保存的颜色主题
 */










/** 启动时应用已保存的颜色主题 */
function applySavedTheme() {
    try {
        const theme = localStorage.getItem('qc-plus-theme');
        const root = document.documentElement;
        /*
         * 预设主题色值（与 settings 组件保持一致；settings 打开时 setColorTheme 会再应用一次）
         * --qc-bg / --qc-bg-rgb       面板整体背景 / RGB 分量
         * --qc-text                    主文字颜色（命令名、标题等）
         * --qc-text-secondary          次要文字颜色（搜索框文字、命令预览等）
         * --qc-text-muted              辅助文字颜色（图标、提示、占位符等）
         * --qc-group-name              分组夹名称颜色
         * --qc-primary / --qc-primary-rgb 主色调（按钮、选中态、快速入口等）/ RGB 分量
         * --qc-surface / --qc-surface-rgb 标题栏/卡片背景色 / RGB 分量
         * --qc-border                  边框颜色
         * --qc-input-bg                输入框背景色
         * --qc-hover                   悬停高亮背景色
         * --qc-blur                    毛玻璃模糊程度
         * --qc-saturate                毛玻璃饱和度
         * --qc-shadow                  面板整体阴影
         */
        const presets = {
            'acrylic-light': { '--qc-primary': '#4f7dff', '--qc-primary-rgb': '79,125,255', '--qc-bg': 'rgba(213,213,216,0.96)', '--qc-bg-rgb': '213,213,216', '--qc-text': '#162234', '--qc-text-secondary': '#607188', '--qc-text-muted': '#8c97ab', '--qc-group-name': '#4a6080', '--qc-border': 'rgba(255,255,255,0.28)', '--qc-surface': 'rgba(255,255,255,0.34)', '--qc-surface-rgb': '255,255,255', '--qc-hover': 'rgba(255,255,255,0.24)', '--qc-input-bg': 'rgba(255,255,255,0.52)', '--qc-blur': '28px', '--qc-saturate': '180%', '--qc-shadow': '0 10px 38px rgba(0,0,0,0.16)' },
            'acrylic-dark': { '--qc-primary': '#5b8def', '--qc-primary-rgb': '91,141,239', '--qc-bg': 'rgba(20,20,20,0.52)', '--qc-bg-rgb': '20,20,20', '--qc-text': '#e8e8e8', '--qc-text-secondary': '#b2b2b2', '--qc-text-muted': '#8f8f8f', '--qc-group-name': '#b2b2b2', '--qc-border': 'rgba(255,255,255,0.10)', '--qc-surface': 'rgba(45,45,45,0.42)', '--qc-surface-rgb': '45,45,45', '--qc-hover': 'rgba(255,255,255,0.06)', '--qc-input-bg': 'rgba(255,255,255,0.08)', '--qc-blur': '30px', '--qc-saturate': '145%', '--qc-shadow': '0 10px 38px rgba(0,0,0,0.40)' },
            'ocean': { '--qc-primary': '#22d3ee', '--qc-primary-rgb': '34,211,238', '--qc-bg': 'rgba(8,24,48,0.60)', '--qc-bg-rgb': '8,24,48', '--qc-text': '#e0f0ff', '--qc-text-secondary': '#90b8e0', '--qc-text-muted': '#5888b8', '--qc-group-name': '#90b8e0', '--qc-border': 'rgba(100,180,240,0.14)', '--qc-surface': 'rgba(20,50,90,0.35)', '--qc-surface-rgb': '20,50,90', '--qc-hover': 'rgba(100,160,220,0.08)', '--qc-input-bg': 'rgba(10,30,60,0.50)', '--qc-blur': '26px', '--qc-saturate': '170%', '--qc-shadow': '0 10px 38px rgba(0,40,80,0.40)' },
            'forest': { '--qc-primary': '#34d399', '--qc-primary-rgb': '52,211,153', '--qc-bg': 'rgba(8,28,16,0.58)', '--qc-bg-rgb': '8,28,16', '--qc-text': '#d8f8e0', '--qc-text-secondary': '#80c898', '--qc-text-muted': '#509868', '--qc-group-name': '#80c898', '--qc-border': 'rgba(80,180,120,0.12)', '--qc-surface': 'rgba(16,50,28,0.35)', '--qc-surface-rgb': '16,50,28', '--qc-hover': 'rgba(80,160,100,0.08)', '--qc-input-bg': 'rgba(8,30,16,0.48)', '--qc-blur': '26px', '--qc-saturate': '155%', '--qc-shadow': '0 10px 38px rgba(0,30,10,0.40)' },
            'sunset': { '--qc-primary': '#fb923c', '--qc-primary-rgb': '251,146,60', '--qc-bg': 'rgba(40,16,8,0.62)', '--qc-bg-rgb': '40,16,8', '--qc-text': '#ffe8d8', '--qc-text-secondary': '#d0a088', '--qc-text-muted': '#a07058', '--qc-group-name': '#d0a088', '--qc-border': 'rgba(200,120,80,0.14)', '--qc-surface': 'rgba(60,24,12,0.38)', '--qc-surface-rgb': '60,24,12', '--qc-hover': 'rgba(200,100,60,0.08)', '--qc-input-bg': 'rgba(30,10,4,0.50)', '--qc-blur': '24px', '--qc-saturate': '150%', '--qc-shadow': '0 10px 38px rgba(40,10,0,0.40)' },
            'lavender': { '--qc-primary': '#a78bfa', '--qc-primary-rgb': '167,139,250', '--qc-bg': 'rgba(22,14,36,0.58)', '--qc-bg-rgb': '22,14,36', '--qc-text': '#ece0fc', '--qc-text-secondary': '#b098d0', '--qc-text-muted': '#7a60a8', '--qc-group-name': '#b098d0', '--qc-border': 'rgba(150,120,210,0.14)', '--qc-surface': 'rgba(36,22,58,0.38)', '--qc-surface-rgb': '36,22,58', '--qc-hover': 'rgba(140,100,200,0.08)', '--qc-input-bg': 'rgba(18,10,30,0.50)', '--qc-blur': '28px', '--qc-saturate': '160%', '--qc-shadow': '0 10px 38px rgba(20,10,30,0.40)' },
        };
        // 预设主题：直接应用色值
        if (theme && presets[theme]) {
            const p = presets[theme];
            for (const [k, v] of Object.entries(p)) {
                root.style.setProperty(k, v);
            }
            console.log('[QC+] Preset theme applied:', theme);
            return;
        }
        // 自定义模式：从 localStorage 逐项恢复
        if (theme === 'custom') {
            const keys = [
                'primary', 'primary-rgb', 'bg', 'bg-rgb',
                'text', 'text-secondary', 'text-muted', 'group-name',
                'border', 'surface', 'surface-rgb',
                'hover', 'input-bg', 'blur', 'saturate', 'shadow'
            ];
            let applied = false;
            for (const k of keys) {
                const val = localStorage.getItem(`qc-plus-color-${k}`);
                if (val) {
                    root.style.setProperty(`--qc-${k}`, val);
                    applied = true;
                }
            }
            if (applied)
                console.log('[QC+] Custom glass theme applied');
            return;
        }
        // Auto / 空：清除所有变量，使用默认值
        const allVars = [
            '--qc-primary', '--qc-primary-rgb', '--qc-bg', '--qc-bg-rgb',
            '--qc-text', '--qc-text-secondary', '--qc-text-muted', '--qc-group-name',
            '--qc-border', '--qc-surface', '--qc-surface-rgb',
            '--qc-hover', '--qc-input-bg', '--qc-blur', '--qc-saturate', '--qc-shadow'
        ];
        allVars.forEach(v => root.style.removeProperty(v));
    }
    catch ( /* ignore */_a) { /* ignore */ }
}
applySavedTheme();
/** 在 Tabby 首页显示 QuickCmd+ 入口按钮，点击直接弹出独立面板 */
let QuickCmdStartPageButtonProvider = class QuickCmdStartPageButtonProvider extends tabby_core__WEBPACK_IMPORTED_MODULE_3__.ToolbarButtonProvider {
    constructor(injector) {
        super();
        this.injector = injector;
    }
    provide() {
        return [{
                icon: '<svg viewBox="0 0 512 512" fill="currentColor"><path d="M9.4 86.6C-3.1 74.1-3.1 53.9 9.4 41.4s32.8-12.5 45.3 0l192 192c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L178.7 256 9.4 86.6zM256 416H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H256c-17.7 0-32-14.3-32-32s14.3-32 32-32z"/></svg>',
                title: 'QuickCmd-Plus',
                weight: 9,
                showInStartPage: true,
                click: () => {
                    _qc_terminal_decorator__WEBPACK_IMPORTED_MODULE_6__.QuickCommandTerminalDecorator.openStandalonePanel(this.injector);
                },
            }];
    }
};
QuickCmdStartPageButtonProvider = __decorate([
    (0,_angular_core__WEBPACK_IMPORTED_MODULE_2__.Injectable)(),
    __metadata("design:paramtypes", [_angular_core__WEBPACK_IMPORTED_MODULE_2__.Injector])
], QuickCmdStartPageButtonProvider);

let QuickCommandPlusModule = class QuickCommandPlusModule {
    constructor() {
        console.log('[QC+] Module loaded OK');
    }
};
QuickCommandPlusModule = __decorate([
    (0,_angular_core__WEBPACK_IMPORTED_MODULE_2__.NgModule)({
        imports: [
            _angular_common__WEBPACK_IMPORTED_MODULE_0__.CommonModule,
            _angular_forms__WEBPACK_IMPORTED_MODULE_1__.FormsModule,
            (tabby_core__WEBPACK_IMPORTED_MODULE_3___default()),
        ],
        declarations: [
            _qc_floating_panel_component__WEBPACK_IMPORTED_MODULE_7__.QuickCommandFloatingPanel,
            _qc_settings_component__WEBPACK_IMPORTED_MODULE_8__.QuickCommandSettingsComponent,
        ],
        providers: [
            { provide: tabby_terminal__WEBPACK_IMPORTED_MODULE_5__.TerminalDecorator, useClass: _qc_terminal_decorator__WEBPACK_IMPORTED_MODULE_6__.QuickCommandTerminalDecorator, multi: true },
            { provide: tabby_settings__WEBPACK_IMPORTED_MODULE_4__.SettingsTabProvider, useClass: _qc_settings_component__WEBPACK_IMPORTED_MODULE_8__.QuickCommandSettingsTabProvider, multi: true },
            { provide: tabby_core__WEBPACK_IMPORTED_MODULE_3__.ToolbarButtonProvider, useClass: QuickCmdStartPageButtonProvider, multi: true },
        ],
    }),
    __metadata("design:paramtypes", [])
], QuickCommandPlusModule);
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (QuickCommandPlusModule);

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=index.js.map