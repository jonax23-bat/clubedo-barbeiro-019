import React, { useState, useEffect } from "react";
import { dbService } from "../firebase/dbService";

export default function ClubStore({ user, navigateTo, refreshUser }) {
  const [activeTab, setActiveTab] = useState("shop"); // shop | convert
  const [storeItems, setStoreItems] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [conversions, setConversions] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  // Conversor XP
  const [xpToConvert, setXpToConvert] = useState(10000);
  const [coinsToReceive, setCoinsToReceive] = useState(100);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Balances
  const [currentUser, setCurrentUser] = useState(user);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const u = await dbService.getUser(user.uid);
      if (u) setCurrentUser(u);
      
      const items = await dbService.getStoreItems();
      const reds = await dbService.getRedemptions({ userUid: user.uid });
      const convs = await dbService.getConversionHistory(user.uid);
      
      setStoreItems(items.filter(i => i.active));
      setRedemptions(reds);
      setConversions(convs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRedeem = async (itemId) => {
    setMessage(null);
    try {
      await dbService.redeemItem(itemId, user.uid);
      setMessage({ type: "success", text: "Resgate efetuado com sucesso! Veja no seu histórico de resgates." });
      loadData();
      if (refreshUser) refreshUser();
    } catch (e) {
      setMessage({ type: "error", text: e.message || "Erro ao efetuar resgate." });
    }
  };

  const adjustXp = (amount) => {
    setMessage(null);
    const newXp = Math.max(10000, xpToConvert + amount);
    if (newXp <= (currentUser.xp || 0)) {
      setXpToConvert(newXp);
      setCoinsToReceive((newXp / 10000) * 100);
    }
  };

  const handleMaxXp = () => {
    setMessage(null);
    const maxPossible = Math.floor((currentUser.xp || 0) / 10000) * 10000;
    if (maxPossible >= 10000) {
      setXpToConvert(maxPossible);
      setCoinsToReceive((maxPossible / 10000) * 100);
    }
  };

  const handleConvert = async (e) => {
    e.preventDefault();
    if (xpToConvert > (currentUser.xp || 0)) {
      setMessage({ type: "error", text: "Saldo de XP insuficiente." });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await dbService.convertXpToCoins(user.uid, xpToConvert);
      setMessage({ type: "success", text: `Conversão efetuada com sucesso! Você recebeu +${coinsToReceive} Coins.` });
      setXpToConvert(10000);
      setCoinsToReceive(100);
      loadData();
      if (refreshUser) refreshUser();
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Erro ao efetuar conversão." });
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = categoryFilter === "all" 
    ? storeItems 
    : storeItems.filter(i => i.category === categoryFilter);

  if (!currentUser || !currentUser.plan) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-md text-center max-w-xl mx-auto space-y-lg">
        <div className="w-20 h-20 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary">
          <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
        </div>
        <div className="space-y-sm">
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Loja do Clube Bloqueada</h2>
          <p className="text-on-surface-variant font-body-md">
            A Loja do Clube Stitch Clubber é exclusiva para assinantes! Assine um dos nossos planos para acumular moedas, converter XP em Coins e resgatar produtos físicos ou descontos exclusivos.
          </p>
        </div>
        <button
          onClick={() => navigateTo("plans")}
          className="bg-tertiary text-on-tertiary px-lg py-4 rounded-xl font-bold uppercase hover:brightness-110 active:scale-95 transition-all w-full shadow-lg shadow-tertiary/20"
        >
          Ver Planos de Assinatura
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-md">
      
      {/* Saldo Bento Widget */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-md">
        <div className="md:col-span-2 glass-card rounded-xl p-md flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
          <div className="space-y-1">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Loja do Clube</h2>
            <p className="text-on-surface-variant font-body-md">Resgate prêmios exclusivos utilizando suas Coins ou converta seu XP.</p>
          </div>
          <div className="flex gap-md bg-surface-container/60 border border-outline-variant/15 p-sm rounded-2xl">
            <div className="text-center px-4">
              <span className="text-outline text-[10px] font-bold uppercase tracking-widest block">Minhas Coins</span>
              <div className="flex items-center gap-1 justify-center pt-1">
                <span className="material-symbols-outlined text-tertiary text-sm">toll</span>
                <span className="font-display-lg text-headline-md font-bold text-tertiary">{currentUser.coins || 0}</span>
              </div>
            </div>
            <div className="w-[1px] bg-outline-variant/30" />
            <div className="text-center px-4">
              <span className="text-outline text-[10px] font-bold uppercase tracking-widest block">Meu XP</span>
              <div className="flex items-center gap-1 justify-center pt-1">
                <span className="material-symbols-outlined text-outline text-sm">stars</span>
                <span className="font-display-lg text-headline-md font-bold text-on-surface">{currentUser.xp || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notificações / Feedbacks */}
        <div className="glass-card p-md rounded-xl flex items-center justify-center min-h-[100px]">
          {message ? (
            <div className={`flex items-start gap-xs text-xs font-semibold ${
              message.type === "success" ? "text-green-400" : "text-error"
            }`}>
              <span className="material-symbols-outlined shrink-0 text-sm">
                {message.type === "success" ? "check_circle" : "error"}
              </span>
              <span>{message.text}</span>
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant italic text-center">Taxa de câmbio: 10.000 XP = 100 Coins</p>
          )}
        </div>
      </section>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant/20 gap-md">
        <button
          onClick={() => { setActiveTab("shop"); setMessage(null); }}
          className={`pb-sm font-label-md text-label-md uppercase tracking-wider relative transition-all ${
            activeTab === "shop" ? "text-tertiary font-bold" : "text-outline hover:text-on-surface"
          }`}
        >
          🎁 Comprar Recompensas
          {activeTab === "shop" && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-tertiary rounded-full animate-scale-in"></span>}
        </button>
        <button
          onClick={() => { setActiveTab("convert"); setMessage(null); }}
          className={`pb-sm font-label-md text-label-md uppercase tracking-wider relative transition-all ${
            activeTab === "convert" ? "text-tertiary font-bold" : "text-outline hover:text-on-surface"
          }`}
        >
          🔄 Converter XP
          {activeTab === "convert" && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-tertiary rounded-full animate-scale-in"></span>}
        </button>
      </div>

      {/* RENDER VIEWS */}
      {activeTab === "shop" && (
        <div className="space-y-md">
          {/* Categorias */}
          <div className="flex flex-wrap gap-xs">
            {[
              { id: "all", label: "Todos os Itens" },
              { id: "products", label: "🧴 Produtos" },
              { id: "discounts", label: "🔖 Descontos" },
              { id: "experiences", label: "🍺 Experiências" }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-sm py-1.5 rounded-lg border text-xs font-label-md transition-all ${
                  categoryFilter === cat.id 
                    ? "bg-tertiary/10 border-tertiary text-tertiary font-bold" 
                    : "bg-surface-container-low border-outline-variant/20 text-on-surface-variant hover:bg-surface-variant"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Grid de Itens da Loja */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            {filteredItems.map(item => {
              const canAfford = (currentUser.coins || 0) >= item.price;
              const hasStock = item.stock > 0;
              return (
                <div key={item.id} className="glass-card rounded-xl p-md flex flex-col justify-between space-y-sm hover:border-tertiary/30 transition-colors">
                  <div className="space-y-xs">
                    <div className="aspect-video w-full rounded-lg overflow-hidden border border-outline-variant/10 bg-surface-container relative">
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 bg-surface-container-lowest/80 px-2 py-0.5 rounded text-[10px] font-bold text-outline border border-outline-variant/25 uppercase">
                        {item.category === "products" ? "Produto" : item.category === "discounts" ? "Desconto" : "Experiência"}
                      </div>
                    </div>
                    
                    <h3 className="font-headline-md text-label-md font-bold text-on-surface pt-xs">{item.name}</h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">{item.description}</p>
                  </div>

                  <div className="space-y-sm pt-xs">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-on-surface-variant uppercase text-[10px]">Estoque:</span>
                      <strong className={hasStock ? "text-green-400" : "text-error"}>
                        {item.stock === 999 ? "Ilimitado" : hasStock ? `${item.stock} unidades` : "Esgotado"}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between border-t border-outline-variant/10 pt-sm">
                      <div className="flex items-center gap-[2px]">
                        <span className="material-symbols-outlined text-tertiary text-sm">toll</span>
                        <strong className="text-on-surface text-lg">{item.price}</strong>
                        <span className="text-[10px] text-outline uppercase font-semibold">Coins</span>
                      </div>

                      <button
                        onClick={() => handleRedeem(item.id)}
                        disabled={!canAfford || !hasStock}
                        className={`px-sm py-2 rounded-lg font-bold text-xs uppercase transition-all active:scale-95 ${
                          !hasStock 
                            ? "bg-surface-variant text-outline cursor-not-allowed" 
                            : !canAfford 
                              ? "border border-error/20 text-error/60 bg-error/5 cursor-not-allowed" 
                              : "bg-tertiary text-on-tertiary hover:brightness-110 shadow-md shadow-tertiary/10"
                        }`}
                      >
                        {!hasStock ? "Sem estoque" : !canAfford ? "Sem saldo" : "Resgatar"}
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

          {/* Histórico de Resgates */}
          <div className="space-y-sm pt-base">
            <h3 className="font-headline-md text-headline-md text-on-surface">Meus Resgates Pendentes e Entregues</h3>
            <div className="glass-card rounded-xl overflow-hidden border border-outline-variant/10">
              <div className="overflow-x-auto">
                {redemptions.length > 0 ? (
                  <table className="w-full text-left">
                    <thead className="bg-surface-variant/50 text-label-sm uppercase font-bold text-on-surface-variant">
                      <tr>
                        <th className="px-md py-sm">Data</th>
                        <th className="px-md py-sm">Recompensa</th>
                        <th className="px-md py-sm">Coins</th>
                        <th className="px-md py-sm">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {redemptions.map(r => (
                        <tr key={r.id}>
                          <td className="px-md py-md text-xs font-mono text-outline">{new Date(r.date).toLocaleDateString()}</td>
                          <td className="px-md py-md font-bold text-on-surface">{r.itemName}</td>
                          <td className="px-md py-md font-bold text-tertiary">{r.itemPrice} moedas</td>
                          <td className="px-md py-md">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-tighter ${
                              r.status === "delivered" 
                                ? "bg-green-500/10 border-green-500/20 text-green-400" 
                                : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                            }`}>
                              {r.status === "delivered" ? "Entregue" : "Pendente"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-xs text-on-surface-variant italic py-md text-center">Nenhum resgate feito ainda.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "convert" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
          
          {/* Calculadora */}
          <div className="lg:col-span-6 glass-card p-md rounded-xl space-y-md border border-tertiary/20">
            <h3 className="font-headline-md text-headline-md text-on-surface">Calculadora de Conversão</h3>
            
            <div className="space-y-sm py-base bg-surface-container-low p-md rounded-xl border border-outline-variant/10">
              <div className="flex justify-between text-xs text-on-surface-variant">
                <span>Saldo de XP Atual:</span>
                <strong className="text-on-surface">{currentUser.xp || 0} XP</strong>
              </div>
              <div className="flex justify-between text-xs text-on-surface-variant">
                <span>Limite Máximo Convertível:</span>
                <strong className="text-tertiary">{Math.floor((currentUser.xp || 0) / 10000) * 10000} XP</strong>
              </div>
            </div>

            <form onSubmit={handleConvert} className="space-y-md">
              <div className="space-y-sm text-center">
                <span className="text-label-sm text-outline uppercase tracking-wider block">XP Investido</span>
                <div className="flex justify-center items-center gap-md">
                  <button 
                    type="button" 
                    onClick={() => adjustXp(-10000)}
                    className="w-10 h-10 rounded-full border border-outline-variant/30 hover:bg-surface-variant flex items-center justify-center text-lg active:scale-95 font-bold"
                  >
                    -
                  </button>
                  <span className="text-headline-lg font-display-lg font-bold text-on-surface font-mono">
                    {xpToConvert.toLocaleString()} XP
                  </span>
                  <button 
                    type="button" 
                    onClick={() => adjustXp(10000)}
                    className="w-10 h-10 rounded-full border border-outline-variant/30 hover:bg-surface-variant flex items-center justify-center text-lg active:scale-95 font-bold"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleMaxXp}
                  className="text-xs text-tertiary font-bold hover:underline"
                >
                  Usar Máximo Convertível
                </button>
              </div>

              {/* Equações */}
              <div className="p-md rounded-xl bg-surface-container-lowest border border-outline-variant/20 space-y-xs text-xs text-on-surface-variant">
                <div className="flex justify-between">
                  <span>Você receberá:</span>
                  <strong className="text-tertiary text-sm flex items-center gap-[2px]">
                    <span className="material-symbols-outlined text-xs">toll</span>
                    {coinsToReceive} Coins
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>XP Restante pós-troca:</span>
                  <strong className="text-on-surface">{(currentUser.xp - xpToConvert || 0).toLocaleString()} XP</strong>
                </div>
                {currentUser.xp % 10000 > 0 && (
                  <p className="text-[10px] text-outline pt-xs italic">
                    * {(currentUser.xp % 10000).toLocaleString()} XP extras serão guardados (mínimo de 10.000 XP por transação).
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={saving || xpToConvert > (currentUser.xp || 0)}
                className="w-full bg-tertiary text-on-tertiary font-bold py-4 rounded-xl text-label-md uppercase shadow-lg shadow-tertiary/20 active:scale-95 transition-transform disabled:opacity-50"
              >
                {saving ? "Processando conversão..." : "Converter XP Agora"}
              </button>
            </form>
          </div>

          {/* Histórico Conversões */}
          <div className="lg:col-span-6 space-y-md">
            <h3 className="font-headline-md text-headline-md text-on-surface">Histórico de Trocas</h3>
            <div className="glass-card rounded-xl overflow-hidden border border-outline-variant/10 max-h-[380px] overflow-y-auto custom-scrollbar">
              {conversions.length > 0 ? (
                <div className="p-md divide-y divide-outline-variant/15 space-y-sm">
                  {conversions.map(c => (
                    <div key={c.id} className="pt-sm flex justify-between items-center text-xs">
                      <div className="flex items-center gap-sm">
                        <div className="w-8 h-8 rounded-lg bg-surface-variant flex items-center justify-center text-tertiary font-bold">
                          🔁
                        </div>
                        <div>
                          <p className="font-bold text-on-surface">Conversão Efetuada</p>
                          <p className="text-[10px] text-outline">{new Date(c.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-error font-bold">-{c.xpDeducted.toLocaleString()} XP</p>
                        <p className="text-green-400 font-bold">+{c.coinsAdded} Coins</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-on-surface-variant italic p-md text-center">Nenhuma conversão feita ainda.</p>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
