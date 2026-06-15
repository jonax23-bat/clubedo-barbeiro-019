import React, { useState } from "react";
import { dbService } from "../firebase/dbService";

export default function Login({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginOrEmail, setLoginOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isSignUp) {
      if (!name.trim() || !email.trim() || !password) {
        setError("Por favor, preencha todos os campos.");
        return;
      }
      setLoading(true);
      try {
        const userObj = await dbService.register(name, email, password);
        onLoginSuccess(userObj);
      } catch (err) {
        if (err.message === "EMAIL_ALREADY_EXISTS") {
          setError("Este e-mail já está cadastrado.");
        } else {
          setError("Ocorreu um erro ao tentar criar a conta. Tente novamente.");
        }
        console.error(err);
      } finally {
        setLoading(false);
      }
    } else {
      if (!loginOrEmail.trim() || !password) {
        setError("Por favor, preencha todos os campos.");
        return;
      }
      setLoading(true);
      try {
        const userObj = await dbService.login(loginOrEmail, password);
        onLoginSuccess(userObj);
      } catch (err) {
        if (err.message === "USER_NOT_FOUND") {
          setError("Usuário não encontrado. Verifique o e-mail ou nome de usuário.");
        } else if (err.message === "INCORRECT_PASSWORD") {
          setError("Senha incorreta. Tente novamente.");
        } else {
          setError("Ocorreu um erro ao tentar fazer login. Tente novamente.");
        }
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const userObj = await dbService.loginWithGoogle();
      onLoginSuccess(userObj);
    } catch (err) {
      console.error(err);
      setError("Falha ao autenticar com o Google. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };



  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError("");
    setName("");
    setEmail("");
    setLoginOrEmail("");
    setPassword("");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#0a0a0c] text-on-surface p-gutter">
      {/* Decorative Radial Glow Backgrounds */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-tertiary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      {/* Main Glassmorphic Container */}
      <div className="w-full max-w-md relative z-10 space-y-lg">
        {/* Brand Header */}
        <div className="text-center space-y-xs">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-tertiary/10 border border-tertiary/20 mb-sm text-tertiary shadow-lg shadow-tertiary/5">
            <span className="material-symbols-outlined text-4xl">content_cut</span>
          </div>
          <h1 className="font-display-lg text-display-sm text-on-surface tracking-wider">
            ROYAL BLADE
          </h1>
          <p className="font-label-sm text-tertiary uppercase tracking-widest text-[10px]">
            Clubber & Gamified Barber Membership
          </p>
        </div>

        {/* Form Card */}
        <div className="glass-card p-lg rounded-2xl border border-outline-variant/20 shadow-2xl space-y-md">
          <h2 className="font-headline-md text-headline-sm text-on-surface text-center mb-2">
            {isSignUp ? "Criar Nova Conta" : "Acesso ao Painel"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-md">
            {isSignUp ? (
              <>
                {/* Sign Up: Nome */}
                <div className="space-y-xs">
                  <label className="text-[10px] text-outline uppercase font-bold tracking-wider">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
                      person
                    </span>
                    <input
                      type="text"
                      placeholder="Seu nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-surface-container-lowest/80 border border-outline-variant/30 rounded-xl pl-10 pr-4 py-3 text-xs text-on-surface focus:outline-none focus:border-tertiary transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Sign Up: E-mail */}
                <div className="space-y-xs">
                  <label className="text-[10px] text-outline uppercase font-bold tracking-wider">
                    E-mail
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
                      mail
                    </span>
                    <input
                      type="email"
                      placeholder="seu.email@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-surface-container-lowest/80 border border-outline-variant/30 rounded-xl pl-10 pr-4 py-3 text-xs text-on-surface focus:outline-none focus:border-tertiary transition-all"
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              /* Login: E-mail ou Usuário */
              <div className="space-y-xs">
                <label className="text-[10px] text-outline uppercase font-bold tracking-wider">
                  E-mail ou Usuário
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
                    person
                  </span>
                  <input
                    type="text"
                    placeholder="Ex: owner@royalblade.com ou victor.barber"
                    value={loginOrEmail}
                    onChange={(e) => setLoginOrEmail(e.target.value)}
                    className="w-full bg-surface-container-lowest/80 border border-outline-variant/30 rounded-xl pl-10 pr-4 py-3 text-xs text-on-surface focus:outline-none focus:border-tertiary transition-all"
                    required
                  />
                </div>
              </div>
            )}

            {/* Password (for both modes) */}
            <div className="space-y-xs">
              <label className="text-[10px] text-outline uppercase font-bold tracking-wider">
                Senha
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
                  lock
                </span>
                <input
                  type="password"
                  placeholder="Sua senha de acesso"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-container-lowest/80 border border-outline-variant/30 rounded-xl pl-10 pr-4 py-3 text-xs text-on-surface focus:outline-none focus:border-tertiary transition-all"
                  required
                />
              </div>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="p-sm rounded-xl bg-error-container/20 border border-error/20 text-error flex items-center gap-2 text-xs transition-all">
                <span className="material-symbols-outlined text-sm">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-tertiary text-on-tertiary font-bold py-3.5 rounded-xl hover:brightness-110 active:scale-98 transition-all shadow-lg shadow-tertiary/20 uppercase tracking-widest font-label-md disabled:opacity-50 flex items-center justify-center gap-xs"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                  {isSignUp ? "Criando Conta..." : "Autenticando..."}
                </>
              ) : (
                isSignUp ? "Criar Conta e Entrar" : "Entrar no Sistema"
              )}
            </button>
          </form>

          {/* Toggle Mode Link */}
          <div className="text-center pt-xs">
            <button
              type="button"
              onClick={toggleMode}
              className="text-xs text-tertiary font-semibold hover:underline transition-all"
            >
              {isSignUp
                ? "Já possui uma conta? Faça Login"
                : "Não possui conta? Cadastre-se aqui"}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-xs my-sm">
            <div className="flex-1 h-[1px] bg-outline-variant/20" />
            <span className="text-[10px] text-outline font-bold uppercase tracking-wider">ou</span>
            <div className="flex-1 h-[1px] bg-outline-variant/20" />
          </div>

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface font-bold py-3 rounded-xl hover:brightness-110 active:scale-98 transition-all shadow-md flex items-center justify-center gap-sm text-xs uppercase tracking-wider disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            <span>Entrar com o Google</span>
          </button>
        </div>

      </div>
    </div>
  );
}
