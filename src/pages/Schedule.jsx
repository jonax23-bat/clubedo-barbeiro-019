import React, { useState, useEffect, useRef } from "react";
import { dbService } from "../firebase/dbService";

export default function Schedule({ user, navigateTo, refreshUser }) {
  // --- Estados do Componente ---
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  
  const [barbers, setBarbers] = useState([]);
  const [selectedBarber, setSelectedBarber] = useState(null);

  const [availableDays, setAvailableDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Referência do Canvas para o efeito de partículas douradas
  const canvasRef = useRef(null);

  // --- Efeito: Carrega serviços e unidades ---
  useEffect(() => {
    const initData = async () => {
      const sList = await dbService.getServices();
      const uList = await dbService.getUnits();
      const bList = await dbService.getBarbers();
      
      setServices(sList);
      setUnits(uList);
      setBarbers(bList);

      if (sList.length > 0) {
        setSelectedService(sList.find(s => s.id === "cabelo_barba") || sList[0]);
      }
      if (uList.length > 0) {
        setSelectedUnit(uList[0]);
      }
    };
    initData();
  }, []);

  // --- Efeito: Atualiza barbeiros disponíveis com base na unidade selecionada ---
  useEffect(() => {
    if (selectedUnit) {
      const filtered = barbers.filter(b => b.unitIds && b.unitIds.includes(selectedUnit.id));
      if (filtered.length > 0) {
        setSelectedBarber(filtered[0]);
      } else {
        setSelectedBarber(null);
      }
    }
  }, [selectedUnit, barbers]);

  // --- Efeito: Gera os próximos 14 dias do calendário ---
  useEffect(() => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      days.push({
        dateStr: `${yyyy}-${mm}-${dd}`,
        dayLabel: d.getDate(),
        weekdayLabel: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
        monthLabel: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        isToday: i === 0,
        isWeekend: d.getDay() === 0 // Domingo fechado
      });
    }
    setAvailableDays(days);
    if (days.length > 0) {
      setSelectedDate(days[0].dateStr);
    }
  }, []);

  // --- Efeito: Carrega slots disponíveis do motor inteligente ---
  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedBarber || !selectedDate || !selectedService) {
        setSlots([]);
        return;
      }
      setLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const durationMin = parseInt(selectedService.duration) || 30;
        const resSlots = await dbService.getAvailableSlots(selectedBarber.uid, selectedDate, durationMin);
        
        // Mapeia e adiciona bônus de Golden Hour (ex: slots a partir das 17h)
        const mappedSlots = resSlots.map(s => {
          const hour = parseInt(s.time.split(":")[0]);
          const isGolden = hour >= 17;
          return {
            ...s,
            isGolden,
            xpBonus: isGolden ? 200 : 100,
            type: s.available ? (isGolden ? "Golden Hour" : "Vaga Regular") : s.reason,
            barber: selectedBarber.name
          };
        });
        
        setSlots(mappedSlots);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [selectedBarber, selectedDate, selectedService]);

  // --- Efeito de Partículas Douradas no Fundo ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let particles = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const initParticles = () => {
      resizeCanvas();
      particles = [];
      for (let i = 0; i < 25; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          speed: Math.random() * 0.4 + 0.1,
          opacity: Math.random() * 0.6
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.y -= p.speed;
        if (p.y < 0) p.y = canvas.height;

        ctx.fillStyle = `rgba(255, 40, 0, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener("resize", initParticles);
    initParticles();
    animate();

    return () => {
      window.removeEventListener("resize", initParticles);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // --- Função para Confirmar o Agendamento ---
  const handleConfirm = async () => {
    if (!selectedSlot) {
      setMessage({ type: "error", text: "Por favor, selecione um horário disponível!" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const totalXpBonus = selectedService.xp + selectedSlot.xpBonus;

      const appointmentData = {
        clientUid: user.uid,
        clientName: user.name,
        barberUid: selectedBarber.uid,
        barberName: selectedBarber.name,
        date: selectedDate,
        time: selectedSlot.time,
        status: "scheduled",
        type: "regular",
        isGoldenHour: selectedSlot.isGolden,
        xpBonus: totalXpBonus,
        services: [selectedService.name],
        unitId: selectedUnit.id,
        unitName: selectedUnit.name
      };

      // Salva no banco de dados local
      await dbService.createAppointment(appointmentData);

      setMessage({
        type: "success",
        text: `Agendamento realizado com sucesso! Seus pontos de XP (+${totalXpBonus}) e Coins (+${Math.floor(totalXpBonus / 10)}) serão creditados assim que o barbeiro confirmar sua presença na data escolhida.`
      });

      setTimeout(() => {
        navigateTo("home");
      }, 3500);

    } catch (e) {
      console.error(e);
      setMessage({ type: "error", text: "Ocorreu um erro ao salvar o agendamento." });
    } finally {
      setLoading(false);
    }
  };

  if (!selectedService) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="material-symbols-outlined animate-spin text-tertiary text-4xl">sync</span>
      </div>
    );
  }

  return (
    <div className="relative space-y-8">
      <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full pointer-events-none z-0" />

      <div className="relative z-10 space-y-8">
        
        {/* Título */}
        <div className="flex items-center justify-between">
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Agendamento</h2>
          <div className="flex items-center gap-2 text-on-surface-variant font-label-md bg-surface-container/60 border border-outline-variant/10 px-md py-xs rounded-xl">
            <span className="material-symbols-outlined text-sm text-tertiary">calendar_month</span>
            <span>Motor Inteligente Ativo</span>
          </div>
        </div>

        {/* 1. Escolha de Serviço */}
        <section className="space-y-4">
          <h3 className="font-headline-md text-headline-md text-on-surface">1. Escolha o Serviço</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-sm">
            {services.map((option) => {
              const isSelected = selectedService.id === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setSelectedService(option)}
                  className={`glass-card p-md rounded-xl flex items-center justify-between transition-all duration-300 active:scale-95 border border-outline-variant/20 hover:border-tertiary/40 ${
                    isSelected ? "ring-2 ring-tertiary bg-tertiary/5 border-tertiary" : ""
                  }`}
                >
                  <div className="flex items-center gap-sm">
                    <span className={`material-symbols-outlined ${isSelected ? "text-tertiary" : "text-outline"}`}>
                      {option.icon}
                    </span>
                    <div className="text-left">
                      <p className="font-label-md text-on-surface font-semibold">{option.name}</p>
                      <p className="text-xs text-on-surface-variant">{option.duration}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${isSelected ? "text-tertiary" : "text-on-surface"}`}>R$ {option.price}</p>
                    <p className="text-[10px] text-on-surface-variant">+{option.xp} XP</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. Seleção de Unidade e Barbeiro */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {/* Seleção de Unidade */}
          <section className="space-y-4">
            <h3 className="font-headline-md text-headline-md text-on-surface">2. Selecione a Unidade</h3>
            <div className="space-y-sm">
              {units.map(unit => {
                const isSelected = selectedUnit?.id === unit.id;
                return (
                  <button
                    key={unit.id}
                    onClick={() => setSelectedUnit(unit)}
                    className={`w-full glass-card p-sm rounded-xl flex items-center gap-sm text-left border border-outline-variant/20 hover:border-tertiary/40 transition-all ${
                      isSelected ? "ring-2 ring-tertiary bg-tertiary/5 border-tertiary" : ""
                    }`}
                  >
                    <img src={unit.logoUrl} alt={unit.name} className="w-12 h-12 object-cover rounded-lg" />
                    <div>
                      <h4 className="font-bold text-on-surface text-body-md">{unit.name}</h4>
                      <p className="text-xs text-on-surface-variant truncate max-w-[280px]">{unit.address}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Seleção de Barbeiro */}
          <section className="space-y-4">
            <h3 className="font-headline-md text-headline-md text-on-surface">3. Escolha o Profissional</h3>
            <div className="space-y-sm">
              {selectedUnit ? (
                barbers.filter(b => b.unitIds && b.unitIds.includes(selectedUnit.id)).length > 0 ? (
                  barbers.filter(b => b.unitIds && b.unitIds.includes(selectedUnit.id)).map(barber => {
                    const isSelected = selectedBarber?.uid === barber.uid;
                    return (
                      <button
                        key={barber.uid}
                        onClick={() => setSelectedBarber(barber)}
                        className={`w-full glass-card p-sm rounded-xl flex items-center justify-between text-left border border-outline-variant/20 hover:border-tertiary/40 transition-all ${
                          isSelected ? "ring-2 ring-tertiary bg-tertiary/5 border-tertiary" : ""
                        }`}
                      >
                        <div className="flex items-center gap-sm">
                          <img src={barber.avatarUrl} alt={barber.name} className="w-12 h-12 object-cover rounded-lg" />
                          <div>
                            <h4 className="font-bold text-on-surface text-body-md">{barber.name}</h4>
                            <p className="text-xs text-tertiary">{barber.role}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-on-surface-variant flex items-center gap-[2px]">
                            <span className="material-symbols-outlined text-sm text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                            {(barber.rating || 5).toFixed(1)}
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-xs text-on-surface-variant italic py-sm">Nenhum barbeiro disponível nesta unidade.</p>
                )
              ) : (
                <p className="text-xs text-on-surface-variant italic py-sm">Por favor, selecione uma unidade primeiro.</p>
              )}
            </div>
          </section>
        </div>

        {/* 4. Escolha do Dia */}
        <section className="space-y-4">
          <h3 className="font-headline-md text-headline-md text-on-surface">4. Escolha o Dia</h3>
          <div className="glass-card rounded-xl p-md overflow-x-auto hide-scrollbar">
            <div className="flex gap-sm min-w-max">
              {availableDays.map((d, index) => {
                const isSelected = selectedDate === d.dateStr;
                const isSun = d.isWeekend;
                return (
                  <button
                    key={index}
                    disabled={isSun}
                    onClick={() => setSelectedDate(d.dateStr)}
                    className={`flex flex-col items-center justify-center p-md rounded-xl w-16 h-20 transition-all duration-300 font-label-md border select-none ${
                      isSun 
                        ? "bg-red-500/5 border-red-500/10 text-red-500/30 cursor-not-allowed opacity-50" 
                        : isSelected 
                          ? "bg-tertiary text-on-tertiary border-tertiary shadow-lg shadow-tertiary/20"
                          : "bg-surface-container-low border-outline-variant/20 hover:bg-surface-variant text-on-surface"
                    }`}
                  >
                    <span className="text-[10px] uppercase block tracking-tighter opacity-80">{d.weekdayLabel}</span>
                    <span className="text-lg font-bold block my-xs">{d.dayLabel}</span>
                    <span className="text-[8px] uppercase block tracking-tighter opacity-65">{d.monthLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 5. Seleção de Horário */}
        <section className="space-y-4">
          <h3 className="font-headline-md text-headline-md text-on-surface">5. Horários Disponíveis</h3>
          {loadingSlots ? (
            <div className="flex justify-center items-center py-lg">
              <span className="material-symbols-outlined animate-spin text-tertiary text-3xl">sync</span>
            </div>
          ) : slots.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
              {slots.map((slot, index) => {
                if (!slot.available) {
                  return (
                    <div 
                      key={index} 
                      className="relative flex items-center justify-between p-md rounded-xl bg-surface-variant/40 border border-outline-variant/10 opacity-75"
                      title={slot.reason}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-headline-md text-outline">{slot.time}</span>
                        <span className="font-label-sm text-error uppercase tracking-wider text-[10px]">{slot.reason}</span>
                      </div>
                      <span className="text-xs text-outline italic">Horário Ocupado</span>
                    </div>
                  );
                }

                const isSelected = selectedSlot?.time === slot.time;

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedSlot(slot)}
                    className={`group relative flex items-center justify-between p-md rounded-xl glass-card transition-all duration-300 border-l-4 active:scale-95 ${
                      slot.isGolden ? "border-l-tertiary golden-glow" : "border-l-outline-variant"
                    } ${
                      isSelected ? "ring-2 ring-tertiary scale-[1.02]" : ""
                    }`}
                  >
                    <div className="flex flex-col items-start text-left">
                      <span className={`font-headline-md text-on-surface transition-colors ${
                        slot.isGolden ? "group-hover:text-tertiary" : ""
                      }`}>
                        {slot.time}
                      </span>
                      <span className="font-label-sm text-outline uppercase tracking-wider text-[10px]">{slot.type}</span>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
                        slot.isGolden ? "bg-tertiary/20 text-tertiary" : "bg-surface-variant text-outline"
                      }`}>
                        <span className="material-symbols-outlined text-[14px] text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                        <span className="font-label-sm text-[10px]">+{slot.xpBonus} XP</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant italic py-sm">Nenhum horário disponível. Selecione o profissional e o dia desejados.</p>
          )}
        </section>

        {/* Feedback Notificação */}
        {message && (
          <div className={`p-md rounded-xl border flex items-center gap-sm transition-all duration-300 ${
            message.type === "success" 
              ? "bg-green-500/10 border-green-500/30 text-green-400" 
              : "bg-error-container/20 border-error/20 text-error"
          }`}>
            <span className="material-symbols-outlined">
              {message.type === "success" ? "check_circle" : "error"}
            </span>
            <span className="font-body-md">{message.text}</span>
          </div>
        )}

        {/* Resumo Final da Seleção */}
        {selectedSlot && selectedUnit && selectedBarber && (
          <section className="glass-card p-md rounded-2xl space-y-4 border-tertiary/20 relative overflow-hidden animate-scale-in">
            <div className="absolute top-0 right-0 p-gutter">
              <span className="material-symbols-outlined text-tertiary/10 text-6xl rotate-12 select-none pointer-events-none">
                event_available
              </span>
            </div>
            
            <div className="relative z-10">
              <h4 className="font-label-md text-tertiary uppercase mb-2">Resumo da Seleção</h4>
              <div className="space-y-1">
                <p className="font-headline-md text-on-surface">{selectedService.name}</p>
                <p className="font-body-md text-on-surface-variant">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} às{" "}
                  <span className="text-on-surface font-bold">
                    {selectedSlot.time}
                  </span>
                </p>
                <p className="text-xs text-on-surface-variant">
                  Unidade: <strong>{selectedUnit.name}</strong> | Profissional: <strong>{selectedBarber.name}</strong>
                </p>
                <p className="text-sm text-tertiary font-bold pt-xs">
                  Valor: R$ {selectedService.price} | Ganho Estimado: +{selectedService.xp + selectedSlot.xpBonus} XP
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 mt-6">
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="flex-1 bg-tertiary text-on-tertiary font-bold py-4 px-8 rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-tertiary/30 uppercase tracking-widest font-label-md disabled:opacity-50 flex items-center justify-center gap-xs"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">sync</span>
                      Processando...
                    </>
                  ) : (
                    "Confirmar Agendamento"
                  )}
                </button>
                
                <button 
                  onClick={() => navigateTo("home")}
                  className="flex-1 border border-outline-variant text-on-surface font-bold py-4 px-8 rounded-xl hover:bg-surface-variant active:scale-95 transition-all uppercase tracking-widest font-label-md"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
