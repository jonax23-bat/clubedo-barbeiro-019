import React, { useState, useEffect } from "react";
import { dbService } from "./firebase/dbService";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging";
import { db, messaging } from "./firebase/config";

// Importa todas as páginas do aplicativo
import Home from "./pages/Home";
import Schedule from "./pages/Schedule";
import Plans from "./pages/Plans";
import Community from "./pages/Community";
import Bolao from "./pages/Bolao";
import BarberProfile from "./pages/BarberProfile";
import ManageTeam from "./pages/ManageTeam";
import ShopBranding from "./pages/ShopBranding";
import ManageUnits from "./pages/ManageUnits";
import Finance from "./pages/Finance";
import ClubStore from "./pages/ClubStore";
import ManageStore from "./pages/ManageStore";
import ManageLeagues from "./pages/ManageLeagues";
import ClientProfile from "./pages/ClientProfile";
import Login from "./pages/Login";
import OwnerBarberView from "./pages/OwnerBarberView";
import SelectUnit from "./pages/SelectUnit";
import MyAppointments from "./pages/MyAppointments";

export default function App() {
  // --- Estados Globais ---
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState("home"); // home | schedule | plans | community | barber_profile | manage_team | shop_branding
  const [authLoading, setAuthLoading] = useState(true);
  const [brandingName, setBrandingName] = useState("AliJoy Studio");
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [modalPhone, setModalPhone] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  // --- Estados de Notificação ---
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [userUnit, setUserUnit] = useState(null);

  // --- Inicializa o Banco de Dados local/mock ---
  useEffect(() => {
    dbService.init();

    // Carrega o branding configurado da barbearia
    const loadBranding = async () => {
      const data = await dbService.getBranding();
      if (data && data.name) {
        setBrandingName(data.name);
      }
    };
    loadBranding();
    
    // Restaura sessão local imediatamente para evitar flash de tela de login
    const savedUser = localStorage.getItem("clubber_current_user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
        // Set appropriate initial view based on role
        if (parsed.role === "client") {
          // Se o cliente ainda não escolheu uma unidade, mostra a tela de seleção
          if (!parsed.unitId) {
            setCurrentView("select_unit");
          } else {
            setCurrentView("home");
          }
        } else if (parsed.role === "barber") {
          setCurrentView("barber_profile");
        } else if (parsed.role === "owner") {
          setCurrentView("owner_barber_view");
        }
      } catch (e) {
        console.error("Failed to parse saved user", e);
        setCurrentUser(null);
      }
    }

    // Escuta mudanças de estado de autenticação do Firebase
    // Isso garante que após reload, o Firebase Auth resolva o estado do usuário
    // e atualize o currentUser com dados frescos do Firestore
    const unsubscribe = dbService.subscribeToAuth(async (firebaseUser) => {
      setAuthLoading(false);
      if (firebaseUser) {
        try {
          const dbUser = await dbService.getUser(firebaseUser.uid);
          if (dbUser) {
            setCurrentUser(dbUser);
            localStorage.setItem("clubber_current_user", JSON.stringify(dbUser));
            // Se cliente sem unitId, redireciona para seleção
            if (dbUser.role === "client" && !dbUser.unitId) {
              setCurrentView("select_unit");
            }
          } else {
            // Se o usuário está no Firebase Auth mas não tem documento no Firestore:
            // Caso já exista um currentUser carregado no state (por exemplo, que acabou de ser setado pelo Login.jsx),
            // evitamos sobrescrever. Mas se não há currentUser ou ele for de outra conta, limpamos ou criamos.
            const savedUser = localStorage.getItem("clubber_current_user");
            let parsed = null;
            if (savedUser) {
              try { parsed = JSON.parse(savedUser); } catch(e){}
            }

            if (parsed && parsed.uid === firebaseUser.uid) {
              // Já está correto, talvez a gravação no Firestore esteja em andamento
              return;
            }

            console.log("[App] Criando documento no Firestore para usuário do Firebase Auth...");
            const newUserObj = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email.split("@")[0],
              email: firebaseUser.email,
              role: "client",
              xp: 0,
              coins: 0,
              plan: null,
              subscriptionStartDate: null,
              avatarUrl: firebaseUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=60",
              createdAt: new Date().toISOString()
            };
            await dbService.createUserDocument(firebaseUser.uid, newUserObj);
            setCurrentUser(newUserObj);
            localStorage.setItem("clubber_current_user", JSON.stringify(newUserObj));
          }
        } catch (e) {
          console.warn("[App] Erro ao sincronizar estado de autenticação:", e);
          // Se falhar a criação/busca, limpa a sessão para evitar loop e bypass
          if (dbService.isRealFirebase()) {
            await dbService.logout();
            setCurrentUser(null);
            localStorage.removeItem("clubber_current_user");
          }
        }
      } else {
        // Se real Firebase estiver ativo e não houver usuário autenticado no Firebase Auth,
        // limpamos o estado local para garantir que o usuário seja levado à tela de login
        if (dbService.isRealFirebase()) {
          setCurrentUser(null);
          localStorage.removeItem("clubber_current_user");
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // --- Carregador e Listener de Notificações ---
  const loadUserNotifications = async () => {
    if (!currentUser) return;
    try {
      const list = await dbService.getNotifications(currentUser.uid);
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.read).length);
    } catch (e) {
      console.error("Erro ao carregar notificações:", e);
    }
  };

  const requestPushPermission = async (userUid) => {
    try {
      if (!messaging) {
        console.log("[FCM] Mensagens em segundo plano não suportadas ou não inicializadas.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        console.log("[FCM] Permissão de notificação concedida.");
        const vapid = import.meta.env.VITE_FCM_VAPID_KEY || undefined;
        const token = await getToken(messaging, { vapidKey: vapid });
        if (token) {
          console.log("[FCM] Token de registro recebido:", token);
          await dbService.saveFcmToken(userUid, token);
        }
      }
    } catch (e) {
      console.warn("[FCM] Erro ao registrar notificações push:", e);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    loadUserNotifications();
    requestPushPermission(currentUser.uid);

    // Registra listener em primeiro plano (foreground message)
    let unsubscribeMessage = null;
    if (messaging) {
      try {
        unsubscribeMessage = onMessage(messaging, (payload) => {
          console.log("[FCM] Mensagem em primeiro plano recebida:", payload);
          loadUserNotifications();
        });
      } catch (err) {
        console.warn("[FCM] Erro ao registrar onMessage listener:", err);
      }
    }

    // Listener de notificações In-App no Firestore
    let unsubscribeFirestore = null;
    if (dbService.isRealFirebase()) {
      try {
        const q = query(
          collection(db, "notifications"),
          where("recipientUid", "==", currentUser.uid)
        );
        unsubscribeFirestore = onSnapshot(q, (snapshot) => {
          const list = [];
          snapshot.forEach(docSnap => {
            list.push({ id: docSnap.id, ...docSnap.data() });
          });
          list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          setNotifications(list);
          setUnreadCount(list.filter(n => !n.read).length);
        }, (err) => {
          console.warn("Erro no listener de notificações do Firestore:", err);
        });
      } catch (e) {
        console.warn("Erro ao configurar snapshot de notificações:", e);
      }
    } else {
      // Modo Mock: polling a cada 5 segundos
      const interval = setInterval(loadUserNotifications, 5000);
      return () => {
        clearInterval(interval);
        if (unsubscribeMessage) unsubscribeMessage();
      };
    }

    return () => {
      if (unsubscribeMessage) unsubscribeMessage();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, [currentUser]);

  // --- Limpa serviços órfãos se o usuário logado for o dono ---
  useEffect(() => {
    if (currentUser && currentUser.role === "owner") {
      dbService.cleanupOrphanServices();
    }
  }, [currentUser]);

  // --- Carrega unidade do usuário cliente e trata restrição de telas ---
  useEffect(() => {
    const loadUserUnit = async () => {
      if (currentUser && currentUser.role === "client" && currentUser.unitId) {
        try {
          const units = await dbService.getUnits();
          const unit = units.find(u => u.id === currentUser.unitId);
          setUserUnit(unit || null);
        } catch (e) {
          console.warn("Erro ao carregar unidade:", e);
        }
      } else {
        setUserUnit(null);
      }
    };
    loadUserUnit();
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && currentUser.role === "client" && userUnit && userUnit.hidePlans) {
      const restrictedViews = ["home", "plans", "community", "bolao", "club_store"];
      if (restrictedViews.includes(currentView)) {
        setCurrentView("schedule");
      }
    }
  }, [currentUser, userUnit, currentView]);

  // --- Atualiza os dados do usuário atual a partir do Banco de Dados ---
  const refreshUser = async () => {
    if (!currentUser) return;
    const dbUser = await dbService.getUser(currentUser.uid);
    if (dbUser) {
      setCurrentUser({ ...dbUser });
      localStorage.setItem("clubber_current_user", JSON.stringify(dbUser));
    }
  };

  const handleLoginSuccess = (userObj) => {
    setCurrentUser(userObj);
    localStorage.setItem("clubber_current_user", JSON.stringify(userObj));
    
    // Determine view on login
    if (userObj.role === "client") {
      // Se o cliente ainda não escolheu uma unidade, vai para a tela de seleção
      if (!userObj.unitId) {
        setCurrentView("select_unit");
      } else {
        setCurrentView("home");
      }
    } else if (userObj.role === "barber") {
      setCurrentView("barber_profile");
    } else if (userObj.role === "owner") {
      setCurrentView("owner_barber_view");
    }
  };

  const handleUnitSelected = (updatedUser, unit) => {
    setCurrentUser(updatedUser);
    localStorage.setItem("clubber_current_user", JSON.stringify(updatedUser));
    setCurrentView("home");
  };

  const handleLogout = async () => {
    await dbService.logout();
    localStorage.removeItem("clubber_current_user");
    setCurrentUser(null);
  };



  // --- Renderização da Página Atual ---
  const renderView = () => {
    if (!currentUser) return null;
    switch (currentView) {
      case "select_unit":
        return <SelectUnit user={currentUser} onUnitSelected={handleUnitSelected} />;
      case "home":
        return <Home user={currentUser} navigateTo={setCurrentView} refreshUser={refreshUser} />;
      case "schedule":
        return <Schedule user={currentUser} navigateTo={setCurrentView} refreshUser={refreshUser} />;
      case "plans":
        return <Plans user={currentUser} navigateTo={setCurrentView} refreshUser={refreshUser} unitId={currentUser.unitId} />;
      case "community":
        return <Community user={currentUser} navigateTo={setCurrentView} refreshUser={refreshUser} />;
      case "bolao":
        return <Bolao user={currentUser} navigateTo={setCurrentView} refreshUser={refreshUser} />;
      case "barber_profile":
        return <BarberProfile user={currentUser} navigateTo={setCurrentView} refreshUser={refreshUser} initialTab="overview" />;
      case "barber_settings":
        return <BarberProfile user={currentUser} navigateTo={setCurrentView} refreshUser={refreshUser} initialTab="settings" />;
      case "manage_team":
        return <ManageTeam user={currentUser} navigateTo={setCurrentView} refreshUser={refreshUser} />;
      case "shop_branding":
        return <ShopBranding user={currentUser} navigateTo={setCurrentView} onBrandingChange={setBrandingName} />;
      case "manage_units":
        return <ManageUnits />;
      case "finance":
        return <Finance user={currentUser} navigateTo={setCurrentView} />;
      case "club_store":
        return <ClubStore user={currentUser} navigateTo={setCurrentView} refreshUser={refreshUser} />;
      case "manage_store":
        return <ManageStore user={currentUser} navigateTo={setCurrentView} />;
      case "manage_leagues":
        return <ManageLeagues />;
      case "client_profile":
        return <ClientProfile user={currentUser} navigateTo={setCurrentView} refreshUser={refreshUser} onRequestChangeUnit={() => setCurrentView("select_unit")} />;
      case "owner_barber_view":
        return <OwnerBarberView user={currentUser} navigateTo={setCurrentView} />;
      case "my_appointments":
        return <MyAppointments user={currentUser} navigateTo={setCurrentView} refreshUser={refreshUser} />;
      default:
        return <Home user={currentUser} navigateTo={setCurrentView} refreshUser={refreshUser} />;
    }
  };

  // Aguarda o Firebase Auth resolver antes de renderizar
  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-md animate-pulse">
          <div className="w-16 h-16 rounded-full bg-tertiary/10 border border-tertiary/20 flex items-center justify-center text-tertiary shadow-lg shadow-tertiary/5">
            <span className="material-symbols-outlined text-4xl animate-spin">sync</span>
          </div>
          <p className="text-on-surface-variant text-sm font-bold uppercase tracking-wider">Carregando...</p>
        </div>
      </div>
    );
  }

  // Render Login screen if there is no active session
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface custom-scrollbar selection:bg-tertiary/30">
      
      {/* --- TOP BAR --- */}
      <header className="fixed top-0 w-full z-40 flex justify-between items-center px-gutter h-16 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/20 lg:pl-72">
        {/* Logo brand */}
        <div className="flex items-center gap-sm select-none">
          <div className="w-8 h-8 rounded-lg bg-tertiary flex items-center justify-center">
            <span className="material-symbols-outlined text-on-tertiary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              content_cut
            </span>
          </div>
          <span className="font-display-lg text-headline-md font-bold tracking-tighter text-tertiary">
            {brandingName}
          </span>
        </div>

        {/* Informações de Perfil, XP e Logout */}
        <div className="flex items-center gap-sm">
          <div className="flex items-center gap-1 bg-tertiary-container px-3 py-1 rounded-full border border-tertiary/20">
            <span className="material-symbols-outlined text-tertiary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
            <span className="font-label-md text-label-md text-tertiary">{(currentUser.xp || 0).toLocaleString()} XP</span>
          </div>
          <span 
            onClick={() => setCurrentView(currentUser.role === "barber" ? "barber_profile" : "client_profile")}
            className="text-label-md font-bold text-on-surface select-none hover:text-tertiary cursor-pointer transition-colors"
          >
            {currentUser.name}
          </span>
          <div 
            onClick={() => setCurrentView(currentUser.role === "barber" ? "barber_profile" : "client_profile")}
            className="w-8 h-8 rounded-full border border-outline/30 overflow-hidden cursor-pointer hover:border-tertiary transition-colors"
          >
            <img src={currentUser.avatarUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuCFzgQt41z6XWB871q-TOpFiLt3YHzoRlzQ4bOYop4zNuWOqRkRI7fCcxjriIhF9hzE1XQWzmmeqxpeDfFsvZOfDuT3dxzUo_e0vkrj_Ajnei_CyF06Du8iu_stErqozb0p7kv7-tLO9UzSkqy9PZ7sLC-_cG3Y-t79n46M99T-AqCxOoKzAHr25DGZxBi1d8ScA_SXxWSmv1vvlfIyCQ8lWWidOmepLCla6zysF_2zaZ8_MxBRLuMUxr-snR19WILHaBErw5ZvRfyb"} alt={currentUser.name} className="w-full h-full object-cover" />
          </div>

          {/* Sino de Notificações */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-high transition-colors relative ${
                showNotifDropdown ? "text-tertiary bg-surface-container-high" : "text-outline"
              }`}
              title="Notificações"
            >
              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: unreadCount > 0 ? "'FILL' 1" : "'FILL' 0" }}>
                notifications
              </span>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-error text-on-error rounded-full flex items-center justify-center text-[9px] font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown de Notificações */}
            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 glass-card rounded-2xl border border-outline-variant/30 shadow-2xl p-sm space-y-sm z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex justify-between items-center px-xs pb-xs border-b border-outline-variant/10">
                  <h4 className="font-bold text-xs text-on-surface flex items-center gap-xs">
                    <span className="material-symbols-outlined text-xs text-tertiary">notifications</span>
                    Notificações
                  </h4>
                  <div className="flex gap-2">
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        await dbService.markAllNotificationsAsRead(currentUser.uid);
                        loadUserNotifications();
                      }}
                      className="text-[9px] text-tertiary font-bold hover:underline"
                    >
                      Lidas
                    </button>
                    <span className="text-[9px] text-outline">•</span>
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        await dbService.clearAllNotifications(currentUser.uid);
                        loadUserNotifications();
                      }}
                      className="text-[9px] text-error font-bold hover:underline"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-xs">
                  {notifications.length === 0 ? (
                    <div className="py-md text-center text-outline text-xs italic">
                      Nenhuma notificação por aqui.
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      let icon = "info";
                      let iconColor = "text-blue-400";
                      if (notif.type === "booking_created") {
                        icon = "calendar_month";
                        iconColor = "text-emerald-400";
                      } else if (notif.type === "booking_cancelled") {
                        icon = "cancel";
                        iconColor = "text-red-400";
                      } else if (notif.type === "presence_confirmed") {
                        icon = "stars";
                        iconColor = "text-amber-400";
                      }

                      return (
                        <div 
                          key={notif.id}
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!notif.read) {
                              await dbService.markNotificationAsRead(notif.id);
                              loadUserNotifications();
                            }
                          }}
                          className={`p-xs rounded-xl border transition-all cursor-pointer flex gap-sm items-start text-left ${
                            notif.read 
                              ? "bg-surface-variant/20 border-transparent opacity-70" 
                              : "bg-surface-container-high border-outline-variant/20 hover:border-tertiary/30"
                          }`}
                        >
                          <span className={`material-symbols-outlined text-sm shrink-0 mt-0.5 ${iconColor}`}>
                            {icon}
                          </span>
                          <div className="min-w-0 flex-1 space-y-[2px]">
                            <h5 className={`text-xs leading-tight font-bold ${notif.read ? "text-on-surface-variant" : "text-on-surface"}`}>
                              {notif.title}
                            </h5>
                            <p className="text-[10px] text-on-surface-variant leading-normal break-words">
                              {notif.body}
                            </p>
                            <span className="text-[8px] text-outline block">
                              {new Date(notif.createdAt).toLocaleTimeString("pt-BR", {hour: "2-digit", minute: "2-digit"})} - {new Date(notif.createdAt).toLocaleDateString("pt-BR", {day: "numeric", month: "short"})}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={handleLogout}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-error/15 text-outline hover:text-error transition-colors"
            title="Sair"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
          </button>
        </div>
      </header>

      {/* --- NAVIGATION DRAWER (Desktop) --- */}
      <aside className="hidden lg:flex h-screen w-64 fixed left-0 top-0 z-50 flex-col p-md space-y-base bg-surface-container-lowest border-r border-outline-variant/10 shadow-xl">
        <div className="flex items-center gap-sm pb-lg border-b border-outline-variant/10 select-none">
          <div className="w-12 h-12 rounded-xl bg-tertiary flex items-center justify-center">
            <span className="material-symbols-outlined text-on-tertiary font-bold">content_cut</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-md text-headline-md text-tertiary font-bold">Royal Blade</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Painel Administrativo</span>
          </div>
        </div>
        
        <nav className="flex-1 space-y-base pt-md overflow-y-auto hide-scrollbar">
          {currentUser.role === "client" && (
            <>
              {(!userUnit || !userUnit.hidePlans) && (
                <button 
                  onClick={() => setCurrentView("home")}
                  className={`w-full flex items-center gap-md px-md py-sm rounded-lg text-left transition-all ${
                    currentView === "home" ? "bg-secondary-container text-tertiary font-bold" : "text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  <span className="material-symbols-outlined">home</span>
                  <span className="font-body-md">Home</span>
                </button>
              )}
              <button 
                onClick={() => setCurrentView("schedule")}
                className={`w-full flex items-center gap-md px-md py-sm rounded-lg text-left transition-all ${
                  currentView === "schedule" ? "bg-secondary-container text-tertiary font-bold" : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined">calendar_today</span>
                <span className="font-body-md">Agendar</span>
              </button>
              <button 
                onClick={() => setCurrentView("my_appointments")}
                className={`w-full flex items-center gap-md px-md py-sm rounded-lg text-left transition-all ${
                  currentView === "my_appointments" ? "bg-secondary-container text-tertiary font-bold" : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined">content_paste</span>
                <span className="font-body-md">Meus Agendamentos</span>
              </button>
              {(!userUnit || !userUnit.hidePlans) && (
                <>
                  <button 
                    onClick={() => setCurrentView("plans")}
                    className={`w-full flex items-center gap-md px-md py-sm rounded-lg text-left transition-all ${
                      currentView === "plans" ? "bg-secondary-container text-tertiary font-bold" : "text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    <span className="material-symbols-outlined">workspace_premium</span>
                    <span className="font-body-md">Planos</span>
                  </button>
                  <button 
                    onClick={() => setCurrentView("community")}
                    className={`w-full flex items-center gap-md px-md py-sm rounded-lg text-left transition-all ${
                      currentView === "community" ? "bg-secondary-container text-tertiary font-bold" : "text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    <span className="material-symbols-outlined">groups</span>
                    <span className="font-body-md">Comunidade</span>
                  </button>
                  <button 
                    onClick={() => setCurrentView("bolao")}
                    className={`w-full flex items-center gap-md px-md py-sm rounded-lg text-left transition-all ${
                      currentView === "bolao" ? "bg-secondary-container text-tertiary font-bold" : "text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    <span className="material-symbols-outlined">sports_soccer</span>
                    <span className="font-body-md">Bolão</span>
                  </button>
                  <button 
                    onClick={() => setCurrentView("club_store")}
                    className={`w-full flex items-center gap-md px-md py-sm rounded-lg text-left transition-all ${
                      currentView === "club_store" ? "bg-secondary-container text-tertiary font-bold" : "text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    <span className="material-symbols-outlined">store</span>
                    <span className="font-body-md">Loja do Clube</span>
                  </button>
                </>
              )}
              <button 
                onClick={() => setCurrentView("client_profile")}
                className={`w-full flex items-center gap-md px-md py-sm rounded-lg text-left transition-all ${
                  currentView === "client_profile" ? "bg-secondary-container text-tertiary font-bold" : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined">person</span>
                <span className="font-body-md">Meu Perfil</span>
              </button>
            </>
          )}

          {currentUser.role === "barber" && (
            <>
              <button 
                onClick={() => setCurrentView("barber_profile")}
                className={`w-full flex items-center gap-md px-md py-sm rounded-lg text-left transition-all ${
                  currentView === "barber_profile" ? "bg-secondary-container text-tertiary font-bold" : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined">person</span>
                <span className="font-body-md">Meu Perfil</span>
              </button>
              <button 
                onClick={() => setCurrentView("my_appointments")}
                className={`w-full flex items-center gap-md px-md py-sm rounded-lg text-left transition-all ${
                  currentView === "my_appointments" ? "bg-secondary-container text-tertiary font-bold" : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined">content_paste</span>
                <span className="font-body-md">Meus Atendimentos</span>
              </button>
              <button 
                onClick={() => setCurrentView("schedule")}
                className={`w-full flex items-center gap-md px-md py-sm rounded-lg text-left transition-all ${
                  currentView === "schedule" ? "bg-secondary-container text-tertiary font-bold" : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined">calendar_today</span>
                <span className="font-body-md">Agenda Geral</span>
              </button>
              <button 
                onClick={() => setCurrentView("barber_settings")}
                className={`w-full flex items-center gap-md px-md py-sm rounded-lg text-left transition-all ${
                  currentView === "barber_settings" ? "bg-secondary-container text-tertiary font-bold" : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined">settings</span>
                <span className="font-body-md">Configurações</span>
              </button>
            </>
          )}

          {currentUser.role === "owner" && (
            <>
              <button 
                onClick={() => setCurrentView("manage_team")}
                className={`w-full flex items-center gap-md px-md py-sm rounded-lg text-left transition-all ${
                  currentView === "manage_team" ? "bg-secondary-container text-tertiary font-bold" : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined">group</span>
                <span className="font-body-md">Gestão de Equipe</span>
              </button>
              <button 
                onClick={() => setCurrentView("owner_barber_view")}
                className={`w-full flex items-center gap-md px-md py-sm rounded-lg text-left transition-all ${
                  currentView === "owner_barber_view" ? "bg-secondary-container text-tertiary font-bold" : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined">event_note</span>
                <span className="font-body-md">Agenda dos Barbeiros</span>
              </button>
              <button 
                onClick={() => setCurrentView("client_profile")}
                className={`w-full flex items-center gap-md px-md py-sm rounded-lg text-left transition-all ${
                  currentView === "client_profile" ? "bg-secondary-container text-tertiary font-bold" : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined">badge</span>
                <span className="font-body-md">Gestão de Clientes</span>
              </button>
              <button 
                onClick={() => setCurrentView("manage_units")}
                className={`w-full flex items-center gap-md px-md py-sm rounded-lg text-left transition-all ${
                  currentView === "manage_units" ? "bg-secondary-container text-tertiary font-bold" : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined">location_on</span>
                <span className="font-body-md">Unidades</span>
              </button>
              <button 
                onClick={() => setCurrentView("finance")}
                className={`w-full flex items-center gap-md px-md py-sm rounded-lg text-left transition-all ${
                  currentView === "finance" ? "bg-secondary-container text-tertiary font-bold" : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined">payments</span>
                <span className="font-body-md">Financeiro</span>
              </button>
              <button 
                onClick={() => setCurrentView("manage_store")}
                className={`w-full flex items-center gap-md px-md py-sm rounded-lg text-left transition-all ${
                  currentView === "manage_store" ? "bg-secondary-container text-tertiary font-bold" : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined">inventory_2</span>
                <span className="font-body-md">Gerenciar Loja</span>
              </button>
              <button 
                onClick={() => setCurrentView("manage_leagues")}
                className={`w-full flex items-center gap-md px-md py-sm rounded-lg text-left transition-all ${
                  currentView === "manage_leagues" ? "bg-secondary-container text-tertiary font-bold" : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined">sports_soccer</span>
                <span className="font-body-md">Monitorar Bolão</span>
              </button>
              <button 
                onClick={() => setCurrentView("shop_branding")}
                className={`w-full flex items-center gap-md px-md py-sm rounded-lg text-left transition-all ${
                  currentView === "shop_branding" ? "bg-secondary-container text-tertiary font-bold" : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined">storefront</span>
                <span className="font-body-md">Identidade Visual</span>
              </button>
            </>
          )}
        </nav>
        
        {/* Logout (Sair) button at bottom of sidebar */}
        <div className="pt-md border-t border-outline-variant/10">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-md px-md py-sm rounded-lg text-left text-error hover:bg-error/10 transition-all font-bold"
          >
            <span className="material-symbols-outlined text-error">logout</span>
            <span className="font-body-md text-error">Sair</span>
          </button>
        </div>
      </aside>

      {/* --- MAIN CANVAS CONTENT --- */}
      <main className="pt-24 pb-32 px-gutter max-w-container-max mx-auto lg:pl-72 lg:pb-12">
        {renderView()}
      </main>

      {/* --- BOTTOM NAVBAR (Mobile) --- */}
      <nav className="fixed bottom-0 left-0 w-full z-40 flex justify-around items-center px-base pb-safe h-20 bg-surface/90 backdrop-blur-xl border-t border-outline-variant/30 shadow-lg lg:hidden">
        {currentUser.role === "client" ? (
          <>
            {(!userUnit || !userUnit.hidePlans) && (
              <button 
                onClick={() => setCurrentView("home")}
                className={`flex flex-col items-center justify-center px-2 py-1 transition-all ${
                  currentView === "home" ? "bg-tertiary-container text-tertiary rounded-full scale-95" : "text-outline hover:text-tertiary"
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: currentView === "home" ? "'FILL' 1" : "'FILL' 0" }}>home</span>
                <span className="font-label-sm text-[10px]">Home</span>
              </button>
            )}
            <button 
              onClick={() => setCurrentView("schedule")}
              className={`flex flex-col items-center justify-center px-2 py-1 transition-all ${
                currentView === "schedule" ? "bg-tertiary-container text-tertiary rounded-full scale-95" : "text-outline hover:text-tertiary"
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: currentView === "schedule" ? "'FILL' 1" : "'FILL' 0" }}>calendar_today</span>
              <span className="font-label-sm text-[10px]">Agenda</span>
            </button>
            <button 
              onClick={() => setCurrentView("my_appointments")}
              className={`flex flex-col items-center justify-center px-2 py-1 transition-all ${
                currentView === "my_appointments" ? "bg-tertiary-container text-tertiary rounded-full scale-95" : "text-outline hover:text-tertiary"
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: currentView === "my_appointments" ? "'FILL' 1" : "'FILL' 0" }}>content_paste</span>
              <span className="font-label-sm text-[10px]">Meus Agends</span>
            </button>
            {(!userUnit || !userUnit.hidePlans) && (
              <>
                <button 
                  onClick={() => setCurrentView("community")}
                  className={`flex flex-col items-center justify-center px-2 py-1 transition-all ${
                    currentView === "community" ? "bg-tertiary-container text-tertiary rounded-full scale-95" : "text-outline hover:text-tertiary"
                  }`}
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: currentView === "community" ? "'FILL' 1" : "'FILL' 0" }}>groups</span>
                  <span className="font-label-sm text-[10px]">Feed</span>
                </button>
                <button 
                  onClick={() => setCurrentView("bolao")}
                  className={`flex flex-col items-center justify-center px-2 py-1 transition-all ${
                    currentView === "bolao" ? "bg-tertiary-container text-tertiary rounded-full scale-95" : "text-outline hover:text-tertiary"
                  }`}
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: currentView === "bolao" ? "'FILL' 1" : "'FILL' 0" }}>sports_soccer</span>
                  <span className="font-label-sm text-[10px]">Bolão</span>
                </button>
                <button 
                  onClick={() => setCurrentView("club_store")}
                  className={`flex flex-col items-center justify-center px-2 py-1 transition-all ${
                    currentView === "club_store" ? "bg-tertiary-container text-tertiary rounded-full scale-95" : "text-outline hover:text-tertiary"
                  }`}
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: currentView === "club_store" ? "'FILL' 1" : "'FILL' 0" }}>store</span>
                  <span className="font-label-sm text-[10px]">Loja</span>
                </button>
                <button 
                  onClick={() => setCurrentView("plans")}
                  className={`flex flex-col items-center justify-center px-2 py-1 transition-all ${
                    currentView === "plans" ? "bg-tertiary-container text-tertiary rounded-full scale-95" : "text-outline hover:text-tertiary"
                  }`}
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: currentView === "plans" ? "'FILL' 1" : "'FILL' 0" }}>workspace_premium</span>
                  <span className="font-label-sm text-[10px]">Planos</span>
                </button>
              </>
            )}
          </>
        ) : currentUser.role === "barber" ? (
          <>
            <button 
              onClick={() => setCurrentView("barber_profile")}
              className={`flex flex-col items-center justify-center px-4 py-1 transition-all ${
                currentView === "barber_profile" ? "bg-tertiary-container text-tertiary rounded-full scale-95" : "text-outline hover:text-tertiary"
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: currentView === "barber_profile" ? "'FILL' 1" : "'FILL' 0" }}>person</span>
              <span className="font-label-sm text-label-sm">Perfil</span>
            </button>
            <button 
              onClick={() => setCurrentView("my_appointments")}
              className={`flex flex-col items-center justify-center px-4 py-1 transition-all ${
                currentView === "my_appointments" ? "bg-tertiary-container text-tertiary rounded-full scale-95" : "text-outline hover:text-tertiary"
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: currentView === "my_appointments" ? "'FILL' 1" : "'FILL' 0" }}>content_paste</span>
              <span className="font-label-sm text-label-sm">Atendimentos</span>
            </button>
            <button 
              onClick={() => setCurrentView("schedule")}
              className={`flex flex-col items-center justify-center px-4 py-1 transition-all ${
                currentView === "schedule" ? "bg-tertiary-container text-tertiary rounded-full scale-95" : "text-outline hover:text-tertiary"
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: currentView === "schedule" ? "'FILL' 1" : "'FILL' 0" }}>event_note</span>
              <span className="font-label-sm text-label-sm">Agenda</span>
            </button>
            <button 
              onClick={() => setCurrentView("barber_settings")}
              className={`flex flex-col items-center justify-center px-4 py-1 transition-all ${
                currentView === "barber_settings" ? "bg-tertiary-container text-tertiary rounded-full scale-95" : "text-outline hover:text-tertiary"
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: currentView === "barber_settings" ? "'FILL' 1" : "'FILL' 0" }}>settings</span>
              <span className="font-label-sm text-label-sm">Config</span>
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={() => setCurrentView("owner_barber_view")}
              className={`flex flex-col items-center justify-center px-2 py-1 transition-all ${
                currentView === "owner_barber_view" ? "bg-tertiary-container text-tertiary rounded-full scale-95" : "text-outline hover:text-tertiary"
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: currentView === "owner_barber_view" ? "'FILL' 1" : "'FILL' 0" }}>event_note</span>
              <span className="font-label-sm text-[10px]">Agenda</span>
            </button>
            <button 
              onClick={() => setCurrentView("client_profile")}
              className={`flex flex-col items-center justify-center px-2 py-1 transition-all ${
                currentView === "client_profile" ? "bg-tertiary-container text-tertiary rounded-full scale-95" : "text-outline hover:text-tertiary"
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: currentView === "client_profile" ? "'FILL' 1" : "'FILL' 0" }}>badge</span>
              <span className="font-label-sm text-[10px]">Clientes</span>
            </button>
            <button 
              onClick={() => setCurrentView("finance")}
              className={`flex flex-col items-center justify-center px-2 py-1 transition-all ${
                currentView === "finance" ? "bg-tertiary-container text-tertiary rounded-full scale-95" : "text-outline hover:text-tertiary"
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: currentView === "finance" ? "'FILL' 1" : "'FILL' 0" }}>payments</span>
              <span className="font-label-sm text-[10px]">Finanças</span>
            </button>
            <button 
              onClick={() => setCurrentView("manage_store")}
              className={`flex flex-col items-center justify-center px-2 py-1 transition-all ${
                currentView === "manage_store" ? "bg-tertiary-container text-tertiary rounded-full scale-95" : "text-outline hover:text-tertiary"
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: currentView === "manage_store" ? "'FILL' 1" : "'FILL' 0" }}>inventory_2</span>
              <span className="font-label-sm text-[10px]">Loja</span>
            </button>
            <button 
              onClick={() => setCurrentView("manage_leagues")}
              className={`flex flex-col items-center justify-center px-2 py-1 transition-all ${
                currentView === "manage_leagues" ? "bg-tertiary-container text-tertiary rounded-full scale-95" : "text-outline hover:text-tertiary"
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: currentView === "manage_leagues" ? "'FILL' 1" : "'FILL' 0" }}>sports_soccer</span>
              <span className="font-label-sm text-[10px]">Bolão</span>
            </button>
            <button 
              onClick={() => setShowMoreMenu(true)}
              className={`flex flex-col items-center justify-center px-2 py-1 transition-all ${
                showMoreMenu ? "bg-tertiary-container text-tertiary rounded-full scale-95" : "text-outline hover:text-tertiary"
              }`}
            >
              <span className="material-symbols-outlined">more_horiz</span>
              <span className="font-label-sm text-[10px]">Mais</span>
            </button>
          </>
        )}
      </nav>

      {/* Floating More Menu for Mobile Owner */}
      {showMoreMenu && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setShowMoreMenu(false)}
        >
          <div 
            className="absolute bottom-20 left-0 w-full bg-surface-container-high border-t border-outline-variant/30 rounded-t-2xl p-md pb-lg space-y-md shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-outline-variant/10 pb-sm">
              <span className="font-headline-sm text-label-md text-outline uppercase tracking-wider font-bold">Mais Opções</span>
              <button 
                onClick={() => setShowMoreMenu(false)}
                className="text-outline hover:text-on-surface p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-sm">
              <button
                onClick={() => { setCurrentView("manage_team"); setShowMoreMenu(false); }}
                className={`flex items-center gap-sm p-sm rounded-lg border text-left transition-all ${
                  currentView === "manage_team" 
                    ? "bg-tertiary-container border-tertiary/30 text-tertiary" 
                    : "bg-surface border-outline-variant/20 text-on-surface-variant hover:bg-surface-variant/30"
                }`}
              >
                <span className="material-symbols-outlined">group</span>
                <span className="font-label-md text-xs font-semibold">Gestão Equipe</span>
              </button>

              <button
                onClick={() => { setCurrentView("manage_units"); setShowMoreMenu(false); }}
                className={`flex items-center gap-sm p-sm rounded-lg border text-left transition-all ${
                  currentView === "manage_units" 
                    ? "bg-tertiary-container border-tertiary/30 text-tertiary" 
                    : "bg-surface border-outline-variant/20 text-on-surface-variant hover:bg-surface-variant/30"
                }`}
              >
                <span className="material-symbols-outlined">location_on</span>
                <span className="font-label-md text-xs font-semibold">Unidades</span>
              </button>
              
              <button
                onClick={() => { setCurrentView("shop_branding"); setShowMoreMenu(false); }}
                className={`flex items-center gap-sm p-sm rounded-lg border text-left transition-all ${
                  currentView === "shop_branding" 
                    ? "bg-tertiary-container border-tertiary/30 text-tertiary" 
                    : "bg-surface border-outline-variant/20 text-on-surface-variant hover:bg-surface-variant/30"
                }`}
              >
                <span className="material-symbols-outlined">settings</span>
                <span className="font-label-md text-xs font-semibold">Marca</span>
              </button>
            </div>

            <button
              onClick={() => { handleLogout(); setShowMoreMenu(false); }}
              className="w-full flex items-center justify-center gap-sm p-sm rounded-lg bg-error/10 border border-error/20 text-error hover:bg-error/20 transition-all font-bold text-xs uppercase"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              Sair da Conta
            </button>
          </div>
        </div>
      )}

      {/* Cadastro Obrigatório de Telefone */}
      {currentUser && currentUser.role === "client" && !currentUser.phone && (
        <div className="fixed inset-0 z-50 bg-[#0a0a0c]/90 backdrop-blur-md flex items-center justify-center p-gutter animate-fade-in">
          <div className="w-full max-w-md bg-surface-container border border-outline-variant/30 rounded-2xl p-lg shadow-2xl space-y-md text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-tertiary/10 border border-tertiary/20 text-tertiary shadow-lg shadow-tertiary/5">
              <span className="material-symbols-outlined text-4xl">call</span>
            </div>
            
            <div className="space-y-xs">
              <h2 className="font-headline-md text-headline-sm text-on-surface">Número de Telefone Obrigatório</h2>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Olá, {currentUser.name}! Para prosseguir e agendar seus horários ou usar o clube de benefícios, precisamos do seu número de telefone para contato.
              </p>
            </div>

            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                if (!modalPhone.trim()) {
                  setModalError("Por favor, informe seu número de telefone.");
                  return;
                }
                setModalLoading(true);
                setModalError("");
                try {
                  await dbService.updateClient(currentUser.uid, { phone: modalPhone.trim() });
                  await refreshUser();
                } catch (err) {
                  console.error(err);
                  setModalError("Erro ao salvar o telefone. Tente novamente.");
                } finally {
                  setModalLoading(false);
                }
              }} 
              className="space-y-md text-left"
            >
              <div className="space-y-xs">
                <label className="text-[10px] text-outline uppercase font-bold tracking-wider">
                  Telefone / Celular (com DDD)
                </label>
                <input
                  type="tel"
                  placeholder="Ex: (19) 99999-9999"
                  value={modalPhone}
                  onChange={(e) => setModalPhone(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-md py-3 text-xs text-on-surface focus:outline-none focus:border-tertiary transition-all"
                  required
                  autoFocus
                />
              </div>

              {modalError && (
                <p className="text-xs text-error font-bold flex items-center gap-xs">
                  <span className="material-symbols-outlined text-sm">error</span> {modalError}
                </p>
              )}

              <button
                type="submit"
                disabled={modalLoading}
                className="w-full bg-tertiary text-on-tertiary font-bold py-3.5 rounded-xl hover:brightness-110 active:scale-98 transition-all shadow-lg shadow-tertiary/20 uppercase tracking-widest font-label-md disabled:opacity-50 flex items-center justify-center gap-xs"
              >
                {modalLoading ? "Salvando..." : "Confirmar e Entrar"}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-center text-xs text-outline hover:text-error transition-colors mt-xs py-1"
              >
                Sair da Conta
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
