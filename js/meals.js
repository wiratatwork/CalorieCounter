/**
 * Shared meal list: fetch, sort, render, edit/delete with confirm dialogs.
 */
(function (global) {
  const TABLE = 'daily_calories';

  function refreshIcons() {
    if (global.lucide) global.lucide.createIcons();
  }

  function escapeHtml(text) {
    const el = document.createElement('div');
    el.textContent = text ?? '';
    return el.innerHTML;
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function getTodayRange() {
    const start = startOfDay(new Date());
    return { start, end: addDays(start, 1) };
  }

  /** Month-to-date: 1st of current month 00:00 → tomorrow 00:00 (inclusive of today) */
  function getMtdRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    const end = addDays(startOfDay(now), 1);
    return { start, end };
  }

  function toDateInputValue(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function rangeFromDateInputs(fromValue, toValue) {
    if (!fromValue || !toValue) return null;
    const start = startOfDay(new Date(`${fromValue}T00:00:00`));
    const end = addDays(startOfDay(new Date(`${toValue}T00:00:00`)), 1);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) return null;
    return { start, end };
  }

  function formatThaiDate(date) {
    return date.toLocaleDateString('th-TH', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
  }

  function formatTime(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }

  function formatDateTime(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('th-TH', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return '';
    }
  }

  function currentTimeValue() {
    const now = new Date();
    return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  }

  function isoToTimeValue(iso) {
    if (!iso) return currentTimeValue();
    const d = new Date(iso);
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  function isoToDateValue(iso) {
    if (!iso) return toDateInputValue(new Date());
    return toDateInputValue(new Date(iso));
  }

  function buildCreatedAt(dateValue, timeValue) {
    if (!dateValue || !timeValue) return null;
    const parts = timeValue.split(':');
    if (parts.length < 2) return null;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return null;

    const eatenAt = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(eatenAt.getTime())) return null;
    eatenAt.setHours(hours, minutes, 0, 0);
    return eatenAt.toISOString();
  }

  /** @deprecated prefer buildCreatedAt — kept for add-form "today + time" */
  function buildCreatedAtFromTime(timeValue, baseIso) {
    if (!timeValue) return null;
    const dateValue = baseIso ? isoToDateValue(baseIso) : toDateInputValue(new Date());
    return buildCreatedAt(dateValue, timeValue);
  }

  function sortEntries(entries, sortKey) {
    const list = [...entries];
    list.sort((a, b) => {
      if (sortKey === 'cal_desc') return (Number(b.calories) || 0) - (Number(a.calories) || 0);
      if (sortKey === 'cal_asc') return (Number(a.calories) || 0) - (Number(b.calories) || 0);
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      if (sortKey === 'time_asc') return ta - tb;
      return tb - ta;
    });
    return list;
  }

  function setHint(el, message, type) {
    if (!el) return;
    el.textContent = message || '';
    el.classList.remove('is-error', 'is-ok');
    if (type) el.classList.add(type);
  }

  function ensureMealDialogs() {
    if (document.getElementById('edit-dialog')) return;

    document.body.insertAdjacentHTML(
      'beforeend',
      `
  <dialog id="edit-dialog" class="app-dialog" aria-labelledby="edit-dialog-title">
    <div class="app-dialog__sheet">
      <header class="app-dialog__header">
        <h2 class="app-dialog__title" id="edit-dialog-title">แก้ไขมื้ออาหาร</h2>
        <button type="button" id="edit-close-btn" class="app-icon-btn" aria-label="ปิด">
          <i data-lucide="x" class="app-icon-btn__icon" aria-hidden="true"></i>
        </button>
      </header>
      <form class="app-dialog__body" id="edit-form" autocomplete="off">
        <input type="hidden" id="edit-id">
        <div class="app-field">
          <label class="app-label" for="edit-food">ชื่อเมนู</label>
          <input id="edit-food" class="app-input" type="text" required autocomplete="off">
        </div>
        <div class="app-field">
          <label class="app-label" for="edit-cal">แคลอรี่ (kcal)</label>
          <input id="edit-cal" class="app-input" type="number" required min="0" inputmode="numeric">
        </div>
        <div class="app-field">
          <label class="app-label" for="edit-date">วันที่กิน</label>
          <input id="edit-date" class="app-input" type="date" required>
        </div>
        <div class="app-field">
          <label class="app-label" for="edit-time">เวลาที่กิน</label>
          <input id="edit-time" class="app-input" type="time" required>
        </div>
        <p id="edit-hint" class="app-hint" aria-live="polite"></p>
        <div class="app-dialog__footer app-dialog__footer--flush">
          <button type="button" id="edit-cancel-btn" class="app-btn app-btn--ghost">ยกเลิก</button>
          <button type="submit" class="app-btn" id="edit-save-btn">บันทึก</button>
        </div>
      </form>
    </div>
  </dialog>

  <dialog id="confirm-dialog" class="app-dialog" aria-labelledby="confirm-title">
    <div class="app-dialog__sheet app-dialog__sheet--confirm">
      <header class="app-dialog__header">
        <h2 class="app-dialog__title" id="confirm-title">ยืนยัน</h2>
      </header>
      <div class="app-dialog__body">
        <p class="app-dialog__message" id="confirm-message"></p>
      </div>
      <footer class="app-dialog__footer">
        <button type="button" id="confirm-cancel-btn" class="app-btn app-btn--ghost">ยกเลิก</button>
        <button type="button" id="confirm-ok-btn" class="app-btn">ยืนยัน</button>
      </footer>
    </div>
  </dialog>`
    );
  }

  /**
   * @param {object} options
   * @param {import('@supabase/supabase-js').SupabaseClient} options.supabaseClient
   * @param {HTMLElement|string} options.listEl
   * @param {HTMLElement|string} options.emptyEl
   * @param {HTMLElement|string} [options.sortEl]
   * @param {HTMLElement|string} [options.statusEl]
   * @param {{ totalEl?: HTMLElement|string, countEl?: HTMLElement|string }} [options.summary]
   * @param {() => { start: Date, end: Date }} options.getRange
   * @param {'time'|'datetime'} [options.metaMode='time']
   * @param {string} [options.defaultSort='time_desc']
   * @param {() => void} [options.onChange]
   */
  function createMealList(options) {
    ensureMealDialogs();

    const $ = (ref) => (typeof ref === 'string' ? document.querySelector(ref) : ref);

    const listEl = $(options.listEl);
    const emptyEl = $(options.emptyEl);
    const sortEl = options.sortEl ? $(options.sortEl) : null;
    const statusEl = options.statusEl ? $(options.statusEl) : null;
    const totalEl = options.summary?.totalEl ? $(options.summary.totalEl) : null;
    const countEl = options.summary?.countEl ? $(options.summary.countEl) : null;

    const state = {
      entries: [],
      sort: options.defaultSort || 'time_desc',
      pendingConfirm: null,
      metaMode: options.metaMode || 'time',
    };

    const editDialog = () => document.getElementById('edit-dialog');
    const confirmDialog = () => document.getElementById('confirm-dialog');

    function status(message, type) {
      setHint(statusEl, message, type);
    }

    function editHint(message, type) {
      setHint(document.getElementById('edit-hint'), message, type);
    }

    function updateSummary() {
      const total = state.entries.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
      if (totalEl) totalEl.textContent = total.toLocaleString('th-TH');
      if (countEl) countEl.textContent = String(state.entries.length);
    }

    function render() {
      const sorted = sortEntries(state.entries, state.sort);
      updateSummary();

      if (!sorted.length) {
        listEl.innerHTML = '';
        emptyEl.hidden = false;
        refreshIcons();
        return;
      }

      emptyEl.hidden = true;
      listEl.innerHTML = sorted
        .map((item, index) => {
          const meta =
            state.metaMode === 'datetime'
              ? formatDateTime(item.created_at)
              : formatTime(item.created_at);

          return `
        <article class="app-list-item" data-id="${escapeHtml(item.id)}">
          <span class="app-list-item__index" aria-hidden="true">${index + 1}</span>
          <div class="app-list-item__body">
            <span class="app-list-item__name">${escapeHtml(item.food_name)}</span>
            <span class="app-list-item__time">${meta}</span>
          </div>
          <span class="app-list-item__cal">${Number(item.calories).toLocaleString('th-TH')}</span>
          <div class="app-list-item__actions">
            <button type="button" class="app-icon-btn" data-action="edit" data-id="${escapeHtml(item.id)}" aria-label="แก้ไข ${escapeHtml(item.food_name)}">
              <i data-lucide="pencil" class="app-icon-btn__icon" aria-hidden="true"></i>
            </button>
            <button type="button" class="app-icon-btn app-icon-btn--danger" data-action="delete" data-id="${escapeHtml(item.id)}" aria-label="ลบ ${escapeHtml(item.food_name)}">
              <i data-lucide="trash-2" class="app-icon-btn__icon" aria-hidden="true"></i>
            </button>
          </div>
        </article>`;
        })
        .join('');
      refreshIcons();
    }

    async function reload() {
      const range = options.getRange();
      if (!range) {
        status('ช่วงวันที่ไม่ถูกต้อง', 'is-error');
        return;
      }

      const { data, error } = await options.supabaseClient
        .from(TABLE)
        .select('*')
        .gte('created_at', range.start.toISOString())
        .lt('created_at', range.end.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error(error);
        status('โหลดรายการไม่สำเร็จ', 'is-error');
        return;
      }

      state.entries = data || [];
      render();
      if (typeof options.onChange === 'function') options.onChange(state.entries);
    }

    function findEntry(id) {
      return state.entries.find((item) => item.id === id);
    }

    function openEditDialog(id) {
      const item = findEntry(id);
      if (!item) return;

      document.getElementById('edit-id').value = item.id;
      document.getElementById('edit-food').value = item.food_name || '';
      document.getElementById('edit-cal').value = String(item.calories ?? '');
      document.getElementById('edit-date').value = isoToDateValue(item.created_at);
      document.getElementById('edit-time').value = isoToTimeValue(item.created_at);
      editHint('');
      editDialog().showModal();
      refreshIcons();
      document.getElementById('edit-food').focus();
    }

    function closeEditDialog() {
      if (editDialog().open) editDialog().close();
    }

    function openConfirm(config) {
      state.pendingConfirm = config;
      document.getElementById('confirm-title').textContent = config.title;
      document.getElementById('confirm-message').textContent = config.message;
      const okBtn = document.getElementById('confirm-ok-btn');
      okBtn.textContent = config.okLabel || 'ยืนยัน';
      okBtn.classList.toggle('app-btn--danger', config.danger === true);
      confirmDialog().showModal();
      refreshIcons();
    }

    function closeConfirm() {
      state.pendingConfirm = null;
      if (confirmDialog().open) confirmDialog().close();
      document.getElementById('confirm-ok-btn').classList.remove('app-btn--danger');
    }

    function requestDelete(id) {
      const item = findEntry(id);
      if (!item) return;

      openConfirm({
        mode: 'delete',
        id: item.id,
        title: 'ลบมื้ออาหาร?',
        message: `ต้องการลบ “${item.food_name}” (${Number(item.calories).toLocaleString('th-TH')} kcal) หรือไม่ การลบไม่สามารถย้อนกลับได้`,
        okLabel: 'ลบมื้อนี้',
        danger: true,
      });
    }

    async function applyDelete(id) {
      const { error } = await options.supabaseClient.from(TABLE).delete().eq('id', id);
      if (error) {
        console.error(error);
        status('ลบไม่สำเร็จ ลองอีกครั้ง', 'is-error');
        return false;
      }
      if (navigator.vibrate) navigator.vibrate(12);
      status('ลบมื้อแล้ว', 'is-ok');
      await reload();
      return true;
    }

    async function applyEdit(payload) {
      const { error } = await options.supabaseClient
        .from(TABLE)
        .update({
          food_name: payload.food_name,
          calories: payload.calories,
          created_at: payload.created_at,
        })
        .eq('id', payload.id);

      if (error) {
        console.error(error);
        editHint('บันทึกไม่สำเร็จ ลองอีกครั้ง', 'is-error');
        return false;
      }

      if (navigator.vibrate) navigator.vibrate(12);
      closeEditDialog();
      status('แก้ไขมื้อแล้ว', 'is-ok');
      await reload();
      return true;
    }

    async function insert(payload) {
      const { error } = await options.supabaseClient.from(TABLE).insert(payload);
      if (error) {
        console.error(error);
        return { ok: false, error };
      }
      if (navigator.vibrate) navigator.vibrate(12);
      await reload();
      return { ok: true };
    }

    function bind() {
      if (sortEl) {
        sortEl.value = state.sort;
        sortEl.addEventListener('change', (event) => {
          state.sort = event.target.value;
          render();
        });
      }

      listEl.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-action]');
        if (!btn) return;
        const id = btn.getAttribute('data-id');
        const action = btn.getAttribute('data-action');
        if (action === 'edit') openEditDialog(id);
        if (action === 'delete') requestDelete(id);
      });

      document.getElementById('edit-form').addEventListener('submit', (event) => {
        event.preventDefault();

        const id = document.getElementById('edit-id').value;
        const food = document.getElementById('edit-food').value.trim();
        const cal = parseInt(document.getElementById('edit-cal').value, 10);
        const date = document.getElementById('edit-date').value;
        const time = document.getElementById('edit-time').value;

        if (!food || isNaN(cal) || !date || !time) {
          editHint('กรอกข้อมูลให้ครบ', 'is-error');
          return;
        }

        const createdAt = buildCreatedAt(date, time);
        if (!createdAt) {
          editHint('วันหรือเวลาไม่ถูกต้อง', 'is-error');
          return;
        }

        openConfirm({
          mode: 'edit',
          title: 'ยืนยันการแก้ไข?',
          message: `บันทึกการแก้ไข “${food}” เป็น ${cal.toLocaleString('th-TH')} kcal วันที่ ${date} เวลา ${time} หรือไม่`,
          okLabel: 'ยืนยันแก้ไข',
          danger: false,
          payload: {
            id,
            food_name: food,
            calories: cal,
            created_at: createdAt,
          },
        });
      });

      document.getElementById('edit-cancel-btn').addEventListener('click', closeEditDialog);
      document.getElementById('edit-close-btn').addEventListener('click', closeEditDialog);
      document.getElementById('confirm-cancel-btn').addEventListener('click', closeConfirm);

      document.getElementById('confirm-ok-btn').addEventListener('click', async () => {
        const config = state.pendingConfirm;
        if (!config) return;
        const okBtn = document.getElementById('confirm-ok-btn');
        okBtn.disabled = true;
        try {
          if (config.mode === 'delete') {
            await applyDelete(config.id);
            closeConfirm();
          } else if (config.mode === 'edit') {
            const ok = await applyEdit(config.payload);
            if (ok) closeConfirm();
          }
        } finally {
          okBtn.disabled = false;
        }
      });

      editDialog().addEventListener('click', (event) => {
        if (event.target === editDialog()) closeEditDialog();
      });
      confirmDialog().addEventListener('click', (event) => {
        if (event.target === confirmDialog()) closeConfirm();
      });
    }

    bind();

    return {
      reload,
      insert,
      render,
      status,
      getEntries: () => state.entries,
      setSort(key) {
        state.sort = key;
        if (sortEl) sortEl.value = key;
        render();
      },
    };
  }

  async function fetchMealsInRange(supabaseClient, start, end) {
    const { data, error } = await supabaseClient
      .from(TABLE)
      .select('*')
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  function dateKeyLocal(date) {
    return toDateInputValue(date);
  }

  /** Aggregate meals into daily totals for each day in [start, end). */
  function buildDailySeries(meals, start, end) {
    const byDay = new Map();
    for (let d = startOfDay(start); d < end; d = addDays(d, 1)) {
      byDay.set(dateKeyLocal(d), { date: new Date(d), calories: 0, meals: 0 });
    }

    for (const item of meals) {
      const key = dateKeyLocal(new Date(item.created_at));
      const row = byDay.get(key);
      if (!row) continue;
      row.calories += Number(item.calories) || 0;
      row.meals += 1;
    }

    return [...byDay.values()];
  }

  function createSupabaseClient() {
    const url = global.APP_CONFIG?.supabaseUrl;
    const key = global.APP_CONFIG?.supabaseAnonKey;
    if (!url || !key) throw new Error('Missing APP_CONFIG supabase credentials');
    return global.supabase.createClient(url, key);
  }

  global.Meals = {
    createMealList,
    createSupabaseClient,
    ensureMealDialogs,
    fetchMealsInRange,
    buildDailySeries,
    startOfDay,
    addDays,
    escapeHtml,
    pad2,
    formatThaiDate,
    formatTime,
    formatDateTime,
    getTodayRange,
    getMtdRange,
    toDateInputValue,
    rangeFromDateInputs,
    buildCreatedAt,
    buildCreatedAtFromTime,
    currentTimeValue,
    isoToTimeValue,
    isoToDateValue,
    sortEntries,
    refreshIcons,
    setHint,
  };
})(window);
