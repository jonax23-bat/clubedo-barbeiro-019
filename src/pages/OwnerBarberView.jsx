import React, { useState, useEffect } from "react";
import { dbService } from "../firebase/dbService";

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  scheduled:        { label: "Agendado",   color: "bg-blue-500/15 text-blue-400 border-blue-500/30",         icon: "schedule"     },
  completed:        { label: "Concluído",  color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: "check_circle" },
  cancelled:        { label: "Cancelado",  color: "bg-red-500/15 text-red-400 border-red-500/30",             icon: "cancel"       },
  reschedule_needed:{ label: "Reagendar",  color: "bg-amber-500/15 text-amber-400 border-amber-500/30",       icon: "event_repeat" },
};

const ICON_OPTIONS = [
  "content_cut", "face", "brush", "clean_hands", "spa", "colorize",
  "auto_fix_high", "style", "self_improvement", "face_retouching_natural",
  "waving_hand", "back_hand", "front_hand",
];

const BLANK_SERVICE = { name: "", price: "", time: "30 min", icon: "content_cut", type: "regular" };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildNext14Days() {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, "0");
    const dd   = String(d.getDate()).padStart(2, "0");
    days.push({
      dateStr:      `${yyyy}-${mm}-${dd}`,
      dayLabel:     d.getDate(),
      weekdayLabel: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
      monthLabel:   d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      isToday:      i === 0,
      isWeekend:    d.getDay() === 0,
    });
  }
  return days;
}

const fmtPrice = (v) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ─── Service Edit Modal ───────────────────────────────────────────────────────

function ServiceModal({ service, onSave, onClose }) {
  const [form, setForm] = useState({
    name:  service?.name  || "",
    price: service?.price ?? "",
    time:  service?.time  || "30 min",
    icon:  service?.icon  || "content_cut",
    type:  service?.type  || "regular",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const isNew = !service?.name;

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Informe o nome do serviço."); return; }
    if (form.price === "" || isNaN(Number(form.price))) { setError("Informe um preço válido."); return; }
    setSaving(true);
    await onSave({ ...form, price: Number(form.price) });
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface-container-high border border-outline-variant/30 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-tertiary/15 border border-tertiary/25 flex items-center justify-center">
              <span className="material-symbols-outlined text-tertiary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                {isNew ? "add" : "edit"}
              </span>
            </div>
            <h2 className="font-bold text-on-surface">
              {isNew ? "Novo Serviço" : "Editar Serviço"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* Name */}
          <div className="space-y-1">
            <label className="text-[10px] text-outline uppercase font-bold tracking-wider">Nome do Serviço *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex: Corte Degradê"
              className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-tertiary transition-all"
            />
          </div>

          {/* Price + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-outline uppercase font-bold tracking-wider">Preço (R$) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="0,00"
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-tertiary transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-outline uppercase font-bold tracking-wider">Duração</label>
              <select
                value={form.time}
                onChange={(e) => set("time", e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-tertiary transition-all"
              >
                {["15 min","20 min","30 min","45 min","60 min","90 min","120 min"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Type */}
          <div className="space-y-1">
            <label className="text-[10px] text-outline uppercase font-bold tracking-wider">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: "regular",    label: "Regular",     icon: "content_cut", color: "text-tertiary",  bg: "bg-tertiary/10 border-tertiary/30"   },
                { val: "specialist", label: "Especialista", icon: "star",         color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => set("type", opt.val)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                    form.type === opt.val
                      ? opt.bg
                      : "border-outline-variant/20 bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  <span className={`material-symbols-outlined text-base ${form.type === opt.val ? opt.color : ""}`}
                    style={{ fontVariationSettings: "'FILL' 1" }}>
                    {opt.icon}
                  </span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Picker */}
          <div className="space-y-2">
            <label className="text-[10px] text-outline uppercase font-bold tracking-wider">Ícone</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => set("icon", ic)}
                  title={ic}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                    form.icon === ic
                      ? "bg-tertiary border-tertiary text-on-tertiary shadow-md scale-110"
                      : "bg-surface-container border-outline-variant/20 text-on-surface-variant hover:border-tertiary/40"
                  }`}
                >
                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>{ic}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-error text-xs font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">error</span> {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-outline-variant/30 text-on-surface-variant font-bold text-sm hover:bg-surface-container-high transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-tertiary text-on-tertiary font-bold text-sm hover:brightness-110 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <span className="material-symbols-outlined text-base animate-spin">sync</span>
              ) : (
                <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {isNew ? "add_circle" : "save"}
                </span>
              )}
              {isNew ? "Adicionar" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({ service, onConfirm, onClose }) {
  const [deleting, setDeleting] = useState(false);
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-surface-container-high border border-outline-variant/30 rounded-2xl shadow-2xl p-6 space-y-4 text-center animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-full bg-error/10 border border-error/20 flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-error text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>delete</span>
        </div>
        <div>
          <h3 className="font-bold text-on-surface text-base">Remover Serviço?</h3>
          <p className="text-on-surface-variant text-sm mt-1">
            Tem certeza que deseja remover <strong className="text-on-surface">"{service?.name}"</strong>?
            Esta ação não pode ser desfeita.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-outline-variant/30 text-on-surface-variant font-bold text-sm hover:bg-surface-container transition"
          >
            Cancelar
          </button>
          <button
            onClick={async () => { setDeleting(true); await onConfirm(); setDeleting(false); }}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl bg-error text-on-error font-bold text-sm hover:brightness-110 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {deleting
              ? <span className="material-symbols-outlined text-base animate-spin">sync</span>
              : <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>delete</span>
            }
            Remover
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Block Time Modal ─────────────────────────────────────────────────────────

function BlockTimeModal({ date, onSave, onClose }) {
  const [formData, setFormData] = useState({
    date: date || "",
    startTime: "09:00",
    duration: 30,
    reason: "Particular"
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const times = [];
  for (let h = 7; h <= 22; h++) {
    for (let m = 0; m < 60; m += 15) {
      times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }

  const commonReasons = ["Particular", "Almoço", "Médico", "Treinamento", "Folga"];

  const set = (key, val) => setFormData((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.date) { setError("Selecione a data."); return; }
    if (!formData.startTime) { setError("Selecione o horário de início."); return; }
    if (!formData.reason.trim()) { setError("Informe o motivo do bloqueio."); return; }

    setSaving(true);
    setError("");
    try {
      await onSave(formData);
    } catch (err) {
      setError(err.message || "Erro ao salvar o bloqueio.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface-container-high border border-outline-variant/30 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/25 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-400 text-lg">
                block
              </span>
            </div>
            <h2 className="font-bold text-on-surface">Bloquear Horário</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Date */}
          <div className="space-y-1">
            <label className="text-[10px] text-outline uppercase font-bold tracking-wider">Data do Bloqueio *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => set("date", e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-red-400 transition-all"
              required
            />
          </div>

          {/* Time & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-outline uppercase font-bold tracking-wider">Hora de Início *</label>
              <select
                value={formData.startTime}
                onChange={(e) => set("startTime", e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-red-400 transition-all"
              >
                {times.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-outline uppercase font-bold tracking-wider">Duração</label>
              <select
                value={formData.duration}
                onChange={(e) => set("duration", parseInt(e.target.value))}
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-red-400 transition-all"
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 hora (60 min)</option>
                <option value={90}>1h30 (90 min)</option>
                <option value={120}>2 horas (120 min)</option>
                <option value={180}>3 horas (180 min)</option>
                <option value={240}>4 horas (240 min)</option>
                <option value={480}>Expediente Inteiro (8h)</option>
              </select>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <label className="text-[10px] text-outline uppercase font-bold tracking-wider">Motivo / Descrição *</label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => set("reason", e.target.value)}
              placeholder="Ex: Assunto Pessoal, Consulta Médica..."
              className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-red-400 transition-all"
              required
            />
            {/* Quick Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {commonReasons.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => set("reason", r)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                    formData.reason === r
                      ? "bg-red-500/15 border-red-500/30 text-red-400"
                      : "bg-surface-container border-outline-variant/10 text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-error text-xs font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">error</span> {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-outline-variant/30 text-on-surface-variant font-bold text-sm hover:bg-surface-container-high transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-red-500/80 hover:bg-red-500 text-white font-bold text-sm hover:brightness-110 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <span className="material-symbols-outlined text-base animate-spin">sync</span>
              ) : (
                <span className="material-symbols-outlined text-base">lock</span>
              )}
              Confirmar Bloqueio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OwnerBarberView({ user, navigateTo }) {
  const [barbers,        setBarbers]        = useState([]);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [activeTab,      setActiveTab]      = useState("agenda");
  const [loading,        setLoading]        = useState(true);

  // Agenda tab
  const [days]            = useState(buildNext14Days);
  const [selectedDate,    setSelectedDate]  = useState(buildNext14Days()[0].dateStr);
  const [appointments,    setAppointments]  = useState([]);
  const [loadingApts,     setLoadingApts]   = useState(false);

  // Service editing
  const [serviceModal,   setServiceModal]   = useState(null); // null | { service, index } — index=-1 means new
  const [deleteModal,    setDeleteModal]    = useState(null); // null | { service, index }
  const [savingServices, setSavingServices] = useState(false);
  const [saveSuccess,    setSaveSuccess]    = useState(false);
  const [blockModal,     setBlockModal]     = useState(null); // null | { date }

  // ── Load barbers ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const list = await dbService.getBarbers();
        setBarbers(list);
        if (list.length > 0) setSelectedBarber(list[0]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Load appointments ────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedBarber || activeTab !== "agenda") return;
    const load = async () => {
      setLoadingApts(true);
      try {
        const apts = await dbService.getBarberAppointments(selectedBarber.uid);
        setAppointments(apts);
      } finally {
        setLoadingApts(false);
      }
    };
    load();
  }, [selectedBarber, activeTab]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const specialties = selectedBarber?.specialties || [];

  const saveSpecialties = async (newList) => {
    setSavingServices(true);
    try {
      await dbService.updateBarberProfile(selectedBarber.uid, { specialties: newList });
      // Update local state
      const updated = { ...selectedBarber, specialties: newList };
      setSelectedBarber(updated);
      setBarbers((prev) => prev.map((b) => b.uid === updated.uid ? updated : b));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setSavingServices(false);
    }
  };

  const handleSaveService = async (formData) => {
    const list = [...specialties];

    if (serviceModal.index === -1) {
      // Novo serviço: salva na especialidade do barbeiro e cria registro global
      list.push(formData);
      await saveSpecialties(list);
      try {
        await dbService.createService({
          name: formData.name,
          price: formData.price,
          duration: formData.time,
          icon: formData.icon,
          type: formData.type
        });
      } catch (e) {
        console.warn("Erro ao criar serviço global:", e);
      }
    } else {
      // Editando serviço existente
      const oldSpec = specialties[serviceModal.index];
      list[serviceModal.index] = formData;
      await saveSpecialties(list);
      // Atualiza o serviço global correspondente (pelo nome antigo)
      try {
        const allServices = await dbService.getServices();
        const globalService = allServices.find(s => s.name === oldSpec.name);
        if (globalService) {
          await dbService.updateService(globalService.id, {
            name: formData.name,
            price: formData.price,
            duration: formData.time,
            icon: formData.icon,
            type: formData.type
          });
        } else {
          // Se não achar, cria um novo registro global
          await dbService.createService({
            name: formData.name,
            price: formData.price,
            duration: formData.time,
            icon: formData.icon,
            type: formData.type
          });
        }
      } catch (e) {
        console.warn("Erro ao atualizar serviço global:", e);
      }
    }

    setServiceModal(null);
  };

  const handleDeleteService = async () => {
    const oldSpec = specialties[deleteModal.index];
    const list = specialties.filter((_, i) => i !== deleteModal.index);
    await saveSpecialties(list);

    // Deleta o serviço global correspondente se nenhum outro barbeiro oferecer ele
    try {
      const allBarbers = await dbService.getBarbers();
      const otherBarbersOffer = allBarbers.some(
        (b) => b.uid !== selectedBarber.uid && (b.specialties || []).some((s) => s.name === oldSpec.name)
      );

      if (!otherBarbersOffer) {
        const allServices = await dbService.getServices();
        const globalService = allServices.find((s) => s.name === oldSpec.name);
        if (globalService) {
          await dbService.deleteService(globalService.id);
        }
      }
    } catch (e) {
      console.warn("Erro ao deletar serviço global:", e);
    }

    setDeleteModal(null);
  };

  const handleSaveBlock = async (formData) => {
    try {
      await dbService.createBlockedAppointment({
        barberUid: selectedBarber.uid,
        barberName: selectedBarber.name,
        date: formData.date,
        time: formData.startTime,
        duration: formData.duration,
        blockReason: formData.reason
      });
      // reload appointments
      const apts = await dbService.getBarberAppointments(selectedBarber.uid);
      setAppointments(apts);
      setBlockModal(null);
    } catch (e) {
      console.error("Erro ao criar bloqueio:", e);
      throw e;
    }
  };

  const handleUnblock = async (aptId) => {
    if (window.confirm("Deseja realmente desbloquear este horário?")) {
      try {
        await dbService.deleteAppointment(aptId);
        // reload appointments
        const apts = await dbService.getBarberAppointments(selectedBarber.uid);
        setAppointments(apts);
      } catch (e) {
        console.error("Erro ao desbloquear horário:", e);
        alert("Ocorreu um erro ao desbloquear o horário.");
      }
    }
  };

  // ── Day appointments ─────────────────────────────────────────────────────
  const dayAppointments = appointments
    .filter((a) => a.date === selectedDate)
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  const schedConfig = selectedBarber?.scheduleConfig || {
    start: "09:00", end: "19:00", lunchStart: "12:00", lunchEnd: "13:00", interval: 15,
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-14 h-14 rounded-full bg-tertiary/10 border border-tertiary/20 flex items-center justify-center text-tertiary">
            <span className="material-symbols-outlined text-3xl animate-spin">sync</span>
          </div>
          <p className="text-on-surface-variant text-sm font-bold uppercase tracking-wider">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {serviceModal && (
        <ServiceModal
          service={serviceModal.index === -1 ? null : specialties[serviceModal.index]}
          onSave={handleSaveService}
          onClose={() => setServiceModal(null)}
        />
      )}
      {deleteModal && (
        <DeleteConfirmModal
          service={deleteModal.service}
          onConfirm={handleDeleteService}
          onClose={() => setDeleteModal(null)}
        />
      )}
      {blockModal && (
        <BlockTimeModal
          date={blockModal.date}
          onSave={handleSaveBlock}
          onClose={() => setBlockModal(null)}
        />
      )}

      <div className="space-y-6 animate-in fade-in duration-300">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <h1 className="text-headline-md font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>
              content_cut
            </span>
            Visão dos Barbeiros
          </h1>
          <p className="text-on-surface-variant text-sm">
            Agenda, horários e serviços de cada profissional da equipe.
          </p>
        </div>

        {/* ── Barber Selector ──────────────────────────────────────────────── */}
        {barbers.length === 0 ? (
          <div className="rounded-2xl border border-outline-variant/20 bg-surface-container p-10 text-center space-y-3">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">groups</span>
            <p className="text-on-surface-variant text-sm">Nenhum barbeiro cadastrado ainda.</p>
            <button
              onClick={() => navigateTo("manage_team")}
              className="mt-2 px-4 py-2 rounded-lg bg-tertiary text-on-tertiary text-sm font-bold hover:opacity-90 transition"
            >
              Ir para Gestão de Equipe
            </button>
          </div>
        ) : (
          <>
            {/* Barber chips */}
            <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
              {barbers.map((b) => {
                const isSelected = selectedBarber?.uid === b.uid;
                return (
                  <button
                    key={b.uid}
                    onClick={() => { setSelectedBarber(b); setActiveTab("agenda"); }}
                    className={`flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-200 ${
                      isSelected
                        ? "border-tertiary bg-tertiary/10 shadow-lg shadow-tertiary/10"
                        : "border-outline-variant/20 bg-surface-container hover:border-tertiary/40 hover:bg-surface-container-high"
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={b.avatarUrl || "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=80&auto=format&fit=crop&q=60"}
                        alt={b.name}
                        className={`w-10 h-10 rounded-full object-cover border-2 ${isSelected ? "border-tertiary" : "border-outline/20"}`}
                      />
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface ${
                        b.status === "online" ? "bg-emerald-400" :
                        b.status === "busy"   ? "bg-amber-400"   : "bg-outline/40"
                      }`} />
                    </div>
                    <div className="text-left">
                      <p className={`font-bold text-sm leading-tight ${isSelected ? "text-tertiary" : "text-on-surface"}`}>
                        {b.name.split(" ")[0]}
                      </p>
                      <p className="text-on-surface-variant text-xs">{b.role || "Barbeiro"}</p>
                    </div>
                    {isSelected && (
                      <span className="material-symbols-outlined text-tertiary text-base ml-1" style={{ fontVariationSettings: "'FILL' 1" }}>
                        check_circle
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── Selected Barber Card ────────────────────────────────────── */}
            {selectedBarber && (
              <div className="rounded-2xl border border-outline-variant/20 bg-gradient-to-br from-surface-container to-surface-container-high overflow-hidden">

                {/* Barber hero */}
                <div className="flex items-center gap-4 p-5 border-b border-outline-variant/10">
                  <img
                    src={selectedBarber.avatarUrl || "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=150&auto=format&fit=crop&q=60"}
                    alt={selectedBarber.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-tertiary/30"
                  />
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-on-surface text-lg leading-tight">{selectedBarber.name}</h2>
                    <p className="text-on-surface-variant text-sm">{selectedBarber.role || "Barbeiro"}</p>
                    {selectedBarber.bio && (
                      <p className="text-on-surface-variant text-xs mt-1 line-clamp-2">{selectedBarber.bio}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      selectedBarber.status === "online" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
                      selectedBarber.status === "busy"   ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
                      "bg-outline/10 text-on-surface-variant border-outline/20"
                    }`}>
                      {selectedBarber.status === "online" ? "Online" :
                       selectedBarber.status === "busy"   ? "Ocupado" : "Inativo"}
                    </span>
                    {selectedBarber.rating && (
                      <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                        <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        {Number(selectedBarber.rating).toFixed(1)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-outline-variant/10">
                  {[
                    { id: "agenda",   icon: "calendar_today", label: "Agenda"           },
                    { id: "horarios", icon: "schedule",        label: "Horários"         },
                    { id: "servicos", icon: "content_cut",     label: "Serviços & Preços"},
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all border-b-2 ${
                        activeTab === tab.id
                          ? "border-tertiary text-tertiary"
                          : "border-transparent text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: activeTab === tab.id ? "'FILL' 1" : "'FILL' 0" }}>
                        {tab.icon}
                      </span>
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* ── TAB: AGENDA ────────────────────────────────────────── */}
                {activeTab === "agenda" && (
                  <div className="p-4 space-y-4">
                    {/* Day Picker */}
                    <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                      {days.map((d) => (
                        <button
                          key={d.dateStr}
                          onClick={() => setSelectedDate(d.dateStr)}
                          disabled={d.isWeekend}
                          className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-xl border text-xs font-bold transition-all ${
                            d.isWeekend
                              ? "border-outline-variant/10 bg-surface-container/50 text-on-surface-variant/30 cursor-not-allowed"
                              : selectedDate === d.dateStr
                                ? "border-tertiary bg-tertiary text-on-tertiary shadow-lg shadow-tertiary/20 scale-105"
                                : d.isToday
                                  ? "border-tertiary/50 bg-tertiary/10 text-tertiary"
                                  : "border-outline-variant/20 bg-surface-container text-on-surface hover:border-tertiary/40"
                          }`}
                        >
                          <span className="text-[10px] uppercase opacity-70">{d.weekdayLabel}</span>
                          <span className="text-lg leading-tight">{d.dayLabel}</span>
                          <span className="text-[10px] uppercase opacity-70">{d.monthLabel}</span>
                          {d.isToday && selectedDate !== d.dateStr && (
                            <span className="w-1 h-1 rounded-full bg-tertiary mt-0.5" />
                          )}
                        </button>
                      ))}
                    </div>

                    {loadingApts ? (
                      <div className="flex items-center justify-center py-10">
                        <span className="material-symbols-outlined text-3xl text-tertiary animate-spin">sync</span>
                      </div>
                    ) : dayAppointments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                        <span className="material-symbols-outlined text-5xl text-on-surface-variant/30">event_busy</span>
                        <p className="text-on-surface-variant text-sm font-medium">Sem agendamentos neste dia</p>
                        <button
                          onClick={() => setBlockModal({ date: selectedDate })}
                          className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 active:scale-95 transition"
                        >
                          <span className="material-symbols-outlined text-sm">block</span>
                          Bloquear Horário
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-1 mb-2">
                          <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">
                            {dayAppointments.length} agendamento{dayAppointments.length !== 1 ? "s" : ""} —{" "}
                            {days.find((d) => d.dateStr === selectedDate)?.weekdayLabel},{" "}
                            {new Date(selectedDate + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
                          </p>
                          <button
                            onClick={() => setBlockModal({ date: selectedDate })}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 active:scale-95 transition"
                          >
                            <span className="material-symbols-outlined text-sm">block</span>
                            Bloquear Horário
                          </button>
                        </div>
                        {dayAppointments.map((apt) => {
                          if (apt.isBlocked) {
                            return (
                              <div
                                key={apt.id}
                                className="flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20 hover:border-red-500/30 transition-all"
                              >
                                <div className="flex-shrink-0 w-14 text-center">
                                  <p className="font-bold text-red-400 text-base leading-tight">{apt.time}</p>
                                  <p className="text-red-500/60 text-[10px]">~{apt.duration || 30} min</p>
                                </div>
                                <div className="w-px h-10 bg-red-500/20 flex-shrink-0" />
                                <div className="flex-1 min-w-0 text-left font-sans">
                                  <p className="font-bold text-red-400 text-sm flex items-center gap-1">
                                    <span className="material-symbols-outlined text-base">block</span>
                                    Horário Bloqueado
                                  </p>
                                  <p className="text-on-surface-variant text-xs truncate">
                                    Motivo: {apt.blockReason || "Não especificado"}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleUnblock(apt.id)}
                                  className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-all active:scale-95"
                                  title="Desbloquear horário"
                                >
                                  <span className="material-symbols-outlined text-sm">lock_open</span>
                                  <span className="hidden sm:inline">Desbloquear</span>
                                </button>
                              </div>
                            );
                          }
                          const sc = STATUS_CONFIG[apt.status] || STATUS_CONFIG.scheduled;
                          return (
                            <div
                              key={apt.id}
                              className="flex items-center gap-3 p-3 rounded-xl bg-surface-container border border-outline-variant/10 hover:border-outline-variant/30 transition-all"
                            >
                              <div className="flex-shrink-0 w-14 text-center">
                                <p className="font-bold text-on-surface text-base leading-tight">{apt.time}</p>
                                <p className="text-on-surface-variant text-[10px]">~30 min</p>
                              </div>
                              <div className="w-px h-10 bg-outline-variant/20 flex-shrink-0" />
                              <div className="flex-1 min-w-0 text-left">
                                <p className="font-bold text-on-surface text-sm truncate">
                                  {apt.clientName || "Cliente"}
                                </p>
                                <p className="text-on-surface-variant text-xs truncate">
                                  {(apt.services || []).join(" · ") || "Serviço não especificado"}
                                </p>
                              </div>
                              <span className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${sc.color}`}>
                                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                                  {sc.icon}
                                </span>
                                <span className="hidden sm:inline">{sc.label}</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── TAB: HORÁRIOS ──────────────────────────────────────── */}
                {activeTab === "horarios" && (
                  <div className="p-5 space-y-5">
                    <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">
                      Configuração de Jornada
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Entrada",       icon: "login",        value: schedConfig.start      || "09:00", color: "text-emerald-400" },
                        { label: "Saída",         icon: "logout",       value: schedConfig.end        || "19:00", color: "text-red-400"     },
                        { label: "Início Almoço", icon: "restaurant",   value: schedConfig.lunchStart || "12:00", color: "text-amber-400"   },
                        { label: "Fim do Almoço", icon: "lunch_dining", value: schedConfig.lunchEnd   || "13:00", color: "text-amber-400"   },
                      ].map((item) => (
                        <div key={item.label} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-surface-container border border-outline-variant/20">
                          <span className={`material-symbols-outlined text-2xl ${item.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                          <p className={`font-bold text-2xl ${item.color}`}>{item.value}</p>
                          <p className="text-on-surface-variant text-xs text-center">{item.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-container border border-outline-variant/20">
                      <div className="w-12 h-12 rounded-xl bg-tertiary/10 border border-tertiary/20 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-tertiary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>timer</span>
                      </div>
                      <div>
                        <p className="font-bold text-on-surface">Intervalo entre Atendimentos</p>
                        <p className="text-on-surface-variant text-sm">{schedConfig.interval || 15} minutos por slot</p>
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-tertiary/5 border border-tertiary/15 space-y-2">
                      <p className="text-tertiary text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                        Resumo da Jornada
                      </p>
                      {(() => {
                        const [sh, sm] = (schedConfig.start || "09:00").split(":").map(Number);
                        const [eh, em] = (schedConfig.end   || "19:00").split(":").map(Number);
                        const [lsh, lsm] = (schedConfig.lunchStart || "12:00").split(":").map(Number);
                        const [leh, lem] = (schedConfig.lunchEnd   || "13:00").split(":").map(Number);
                        const totalMin = (eh * 60 + em) - (sh * 60 + sm);
                        const lunchMin = (leh * 60 + lem) - (lsh * 60 + lsm);
                        const workMin  = totalMin - lunchMin;
                        const slots    = Math.floor(workMin / (schedConfig.interval || 15));
                        return (
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-on-surface font-bold text-lg">{Math.floor(workMin / 60)}h{workMin % 60 > 0 ? workMin % 60 + "m" : ""}</p>
                              <p className="text-on-surface-variant text-xs">Carga diária</p>
                            </div>
                            <div>
                              <p className="text-on-surface font-bold text-lg">{lunchMin} min</p>
                              <p className="text-on-surface-variant text-xs">Almoço</p>
                            </div>
                            <div>
                              <p className="text-tertiary font-bold text-lg">{slots}</p>
                              <p className="text-on-surface-variant text-xs">Slots/dia</p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* ── TAB: SERVIÇOS & PREÇOS ────────────────────────────── */}
                {activeTab === "servicos" && (
                  <div className="p-4 space-y-4">

                    {/* Action bar */}
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">
                        {specialties.length} serviço{specialties.length !== 1 ? "s" : ""} cadastrado{specialties.length !== 1 ? "s" : ""}
                      </p>
                      <div className="flex items-center gap-2">
                        {/* Save success toast */}
                        {saveSuccess && (
                          <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold animate-in fade-in duration-300">
                            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            Salvo!
                          </span>
                        )}
                        <button
                          onClick={() => setServiceModal({ index: -1 })}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-tertiary text-on-tertiary text-xs font-bold hover:brightness-110 active:scale-95 transition shadow-md shadow-tertiary/20"
                        >
                          <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                          Novo Serviço
                        </button>
                      </div>
                    </div>

                    {specialties.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                        <span className="material-symbols-outlined text-5xl text-on-surface-variant/30">content_cut</span>
                        <p className="text-on-surface-variant text-sm font-medium">Nenhum serviço cadastrado.</p>
                        <button
                          onClick={() => setServiceModal({ index: -1 })}
                          className="px-4 py-2 rounded-lg bg-tertiary text-on-tertiary text-sm font-bold hover:opacity-90 transition"
                        >
                          + Adicionar primeiro serviço
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Price range */}
                        <div className="flex gap-3 flex-wrap">
                          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-sm">
                            <span className="material-symbols-outlined text-emerald-400 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
                            <span className="text-on-surface font-bold">
                              {fmtPrice(Math.min(...specialties.map((s) => s.price || 0)))} –{" "}
                              {fmtPrice(Math.max(...specialties.map((s) => s.price || 0)))}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-sm">
                            <span className="material-symbols-outlined text-tertiary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
                            <span className="text-on-surface-variant">Ticket médio</span>
                            <span className="text-on-surface font-bold">
                              {fmtPrice(specialties.reduce((s, x) => s + (x.price || 0), 0) / Math.max(specialties.length, 1))}
                            </span>
                          </div>
                        </div>

                        {/* Service cards */}
                        <div className="space-y-2">
                          {specialties.map((spec, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-3 p-4 rounded-2xl bg-surface-container border border-outline-variant/15 hover:border-outline-variant/30 transition-all group"
                            >
                              {/* Icon */}
                              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                spec.type === "specialist"
                                  ? "bg-amber-500/10 border border-amber-500/20"
                                  : "bg-tertiary/10 border border-tertiary/20"
                              }`}>
                                <span
                                  className={`material-symbols-outlined text-xl ${spec.type === "specialist" ? "text-amber-400" : "text-tertiary"}`}
                                  style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                  {spec.icon || "content_cut"}
                                </span>
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-on-surface text-sm truncate">{spec.name}</p>
                                  {spec.type === "specialist" && (
                                    <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase">
                                      Especialista
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="material-symbols-outlined text-on-surface-variant text-xs">schedule</span>
                                  <p className="text-on-surface-variant text-xs">{spec.time || "30 min"}</p>
                                </div>
                              </div>

                              {/* Price */}
                              <div className="text-right flex-shrink-0 mr-1">
                                <p className="font-bold text-emerald-400 text-lg leading-tight">
                                  {fmtPrice(spec.price || 0)}
                                </p>
                                <p className="text-on-surface-variant text-[10px]">por sessão</p>
                              </div>

                              {/* Actions */}
                              <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => setServiceModal({ service: spec, index: idx })}
                                  title="Editar serviço"
                                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-tertiary/10 border border-tertiary/20 text-tertiary hover:bg-tertiary/20 transition"
                                >
                                  <span className="material-symbols-outlined text-base">edit</span>
                                </button>
                                <button
                                  onClick={() => setDeleteModal({ service: spec, index: idx })}
                                  title="Remover serviço"
                                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-error/10 border border-error/20 text-error hover:bg-error/20 transition"
                                >
                                  <span className="material-symbols-outlined text-base">delete</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
