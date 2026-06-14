import React, { useState, useEffect } from "react";
import { dbService } from "./firebase/dbService";

// Importa todas as páginas do aplicativo
import Home from "./pages/Home";
import Schedule from "./pages/Schedule";
import Plans from "./pages/Plans";
import Community from "./pages/Community";
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

export default function App() {
  // --- Estados Globais ---
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState("home"); // home | schedule | plans | community | barber_profile | manage_team | shop_branding
  const [brandingName, setBrandingName] = useState("Clubber Barbershop");
  
  // Dev Backdoor states
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // --- Inicializa o Banco de Dados local/mock ---
  useEffect(() => {
    dbService.init();
    
    // Check if there is an active session
    const savedUser = localStorage.getItem("clubber_current_user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
        // Set appropriate initial view based on role
        if (parsed.role === "client") {
          setCurrentView("home");
        } else if (parsed.role === "barber") {
          setCurrentView("barber_profile");
        } else if (parsed.role === "owner") {
          setCurrentView("manage_team");
        }
      } catch (e) {
        console.error("Failed to parse saved user", e);
        setCurrentUser(null);
      }
    }
  }, []);

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
      setCurrentView("home");
    } else if (userObj.role === "barber") {
      setCurrentView("barber_profile");
    } else if (userObj.role === "owner") {
      setCurrentView("manage_team");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("clubber_current_user");
    setCurrentUser(null);
  };

  // Backdoor Handler: clicking 3 times on the brand logo toggles role switcher
  const handleLogoClick = () => {
    setLogoClickCount(prev => {
      const nextCount = prev + 1;
      if (nextCount >= 3) {
        setShowRoleSwitcher(show => !show);
        return 0; // reset
      }
      return nextCount;
    });
    // Reset click count after 2.5 seconds of inactivity
    setTimeout(() => {
      setLogoClickCount(0);
    }, 2500);
  };

  const handleRoleChange = async (role) => {
    const defaultUsersMap = {
      client: "ricardo_uid",
      barber: "barber_victor",
      owner: "owner_uid"
    };
    const targetUid = defaultUsersMap[role];
    const dbUser = await dbService.getUser(targetUid);
    if (dbUser) {
      setCurrentUser(dbUser);
      localStorage.setItem("clubber_current_user", JSON.stringify(dbUser));
      
      // Change view based on role
      if (role === "client") {
        setCurrentView("home");
      } else if (role === "barber") {
        setCurrentView("barber_profile");
      } else if (role === "owner") {
        setCurrentView("manage_team");
      }
    }
  };

  // --- Renderização da Página Atual ---
  const renderView = () => {
    if (!currentUser) return null;
    switch (currentView) {
      case "home":
        return <Home user={currentUser} navigateTo={setCurrentView} refreshUser={refreshUser} />;
      case "schedule":
        return <Schedule user={currentUser} navigateTo={setCurrentView} refreshUser={refreshUser} />;
      case "plans":
        return <Plans user={currentUser} navigateTo={setCurrentView} refreshUser={refreshUser} />;
      case "community":
        return <Community user={currentUser} navigateTo={setCurrentView} refreshUser={refreshUser} />;
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
        return <ClientProfile user={currentUser} navigateTo={setCurrentView} refreshUser={refreshUser} />;
      default:
        return <Home user={currentUser} navigateTo={setCurrentView} refreshUser={refreshUser} />;
    }
  };

  // Render Login screen if there is no active session
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface custom-scrollbar selection:bg-tertiary/30">
      
      {/* --- FLOATING ROLE SWITCHER (Dev Backdoor) --- */}
      {showRoleSwitcher && (
        <div className="fixed bottom-24 right-6 lg:bottom-6 lg:right-6 z-50 bg-surface-container-high/90 border border-outline-variant/30 px-3 py-2 rounded-xl backdrop-blur flex items-center gap-2 shadow-2xl animate-scale-in">
          <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider hidden sm:inline">Modo:</span>
          <select 
            value={currentUser.role}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="bg-surface border border-outline-variant/30 rounded px-2 py-1 text-label-sm font-label-sm text-tertiary cursor-pointer focus:outline-none"
          >
            <option value="client">Cliente (Ricardo)</option>
            <option value="barber">Barbeiro (Victor)</option>
            <option value="owner">Dono (Marcus)</option>
          </select>
        </div>
      )}

      {/* --- TOP BAR --- */}
      <header className="fixed top-0 w-full z-40 flex justify-between items-center px-gutter h-16 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/20 lg:pl-72">
        {/* Logo brand triggers backdoor click detection */}
        <div onClick={handleLogoClick} className="flex items-center gap-sm cursor-pointer select-none">
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
        <div onClick={handleLogoClick} className="flex items-center gap-sm pb-lg border-b border-outline-variant/10 cursor-pointer select-none">
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
              <button 
                onClick={() => setCurrentView("home")}
                className={`w-full flex items-center gap-md px-md py-sm rounded-lg text-left transition-all ${
                  currentView === "home" ? "bg-secondary-container text-tertiary font-bold" : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined">home</span>
                <span className="font-body-md">Home</span>
              </button>
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
                onClick={() => setCurrentView("club_store")}
                className={`w-full flex items-center gap-md px-md py-sm rounded-lg text-left transition-all ${
                  currentView === "club_store" ? "bg-secondary-container text-tertiary font-bold" : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined">store</span>
                <span className="font-body-md">Loja do Clube</span>
              </button>
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
            <button 
              onClick={() => setCurrentView("home")}
              className={`flex flex-col items-center justify-center px-4 py-1 transition-all ${
                currentView === "home" ? "bg-tertiary-container text-tertiary rounded-full scale-95" : "text-outline hover:text-tertiary"
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: currentView === "home" ? "'FILL' 1" : "'FILL' 0" }}>home</span>
              <span className="font-label-sm text-label-sm">Home</span>
            </button>
            <button 
              onClick={() => setCurrentView("schedule")}
              className={`flex flex-col items-center justify-center px-4 py-1 transition-all ${
                currentView === "schedule" ? "bg-tertiary-container text-tertiary rounded-full scale-95" : "text-outline hover:text-tertiary"
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: currentView === "schedule" ? "'FILL' 1" : "'FILL' 0" }}>calendar_today</span>
              <span className="font-label-sm text-label-sm">Agenda</span>
            </button>
            <button 
              onClick={() => setCurrentView("community")}
              className={`flex flex-col items-center justify-center px-4 py-1 transition-all ${
                currentView === "community" ? "bg-tertiary-container text-tertiary rounded-full scale-95" : "text-outline hover:text-tertiary"
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: currentView === "community" ? "'FILL' 1" : "'FILL' 0" }}>groups</span>
              <span className="font-label-sm text-label-sm">Feed</span>
            </button>
            <button 
              onClick={() => setCurrentView("club_store")}
              className={`flex flex-col items-center justify-center px-4 py-1 transition-all ${
                currentView === "club_store" ? "bg-tertiary-container text-tertiary rounded-full scale-95" : "text-outline hover:text-tertiary"
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: currentView === "club_store" ? "'FILL' 1" : "'FILL' 0" }}>store</span>
              <span className="font-label-sm text-label-sm">Loja</span>
            </button>
            <button 
              onClick={() => setCurrentView("plans")}
              className={`flex flex-col items-center justify-center px-4 py-1 transition-all ${
                currentView === "plans" ? "bg-tertiary-container text-tertiary rounded-full scale-95" : "text-outline hover:text-tertiary"
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: currentView === "plans" ? "'FILL' 1" : "'FILL' 0" }}>workspace_premium</span>
              <span className="font-label-sm text-label-sm">Planos</span>
            </button>
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
              onClick={() => setCurrentView("manage_team")}
              className={`flex flex-col items-center justify-center px-2 py-1 transition-all ${
                currentView === "manage_team" ? "bg-tertiary-container text-tertiary rounded-full scale-95" : "text-outline hover:text-tertiary"
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: currentView === "manage_team" ? "'FILL' 1" : "'FILL' 0" }}>group</span>
              <span className="font-label-sm text-[10px]">Equipe</span>
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

    </div>
  );
}
