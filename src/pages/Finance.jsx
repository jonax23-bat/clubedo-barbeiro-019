import React, { useState, useEffect } from "react";
import { dbService } from "../firebase/dbService";

export default function Finance({ user, navigateTo }) {
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard | transactions | expenses

  // Inputs para nova transação/receita manual
  const [showTxForm, setShowTxForm] = useState(false);
  const [txAmount, setTxAmount] = useState("");
  const [txDesc, setTxDesc] = useState("");
  const [txCategory, setTxCategory] = useState("product"); // appointment | product | other

  // Inputs para nova despesa
  const [showExpForm, setShowExpForm] = useState(false);
  const [expAmount, setExpAmount] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expCategory, setExpCategory] = useState("variable"); // fixed | variable | investment
  const [expRecurring, setExpRecurring] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const summ = await dbService.getFinancialSummary();
      const txs = await dbService.getTransactions();
      const exps = await dbService.getExpenses();
      setSummary(summ);
      setTransactions(txs);
      setExpenses(exps);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTx = async (e) => {
    e.preventDefault();
    if (!txAmount || !txDesc.trim()) return;

    setSaving(true);
    try {
      await dbService.createTransaction({
        type: "revenue",
        amount: parseFloat(txAmount),
        description: txDesc,
        category: txCategory
      });
      setTxAmount("");
      setTxDesc("");
      setShowTxForm(false);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateExp = async (e) => {
    e.preventDefault();
    if (!expAmount || !expDesc.trim()) return;

    setSaving(true);
    try {
      await dbService.createExpense({
        amount: parseFloat(expAmount),
        description: expDesc,
        category: expCategory,
        recurring: expRecurring
      });
      setExpAmount("");
      setExpDesc("");
      setExpRecurring(false);
      setShowExpForm(false);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Data,Tipo,Valor (R$),Categoria,Descricao\n";
    
    transactions.forEach(t => {
      csvContent += `${t.id},${t.date},Entrada,${t.amount},${t.category},"${t.description}"\n`;
    });
    expenses.forEach(e => {
      csvContent += `${e.id},${e.date},Saida,${e.amount},${e.category},"${e.description}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_financeiro_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!summary) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <span className="material-symbols-outlined animate-spin text-tertiary text-4xl">sync</span>
      </div>
    );
  }

  return (
    <div className="space-y-md">
      
      {/* Header com Abas */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Gestão Financeira</h2>
          <p className="text-on-surface-variant font-body-md">Controle de fluxo de caixa, relatórios e lucros em tempo real.</p>
        </div>

        <div className="flex gap-sm w-full md:w-auto">
          <button 
            onClick={handleExportCSV}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-secondary-container/30 border border-outline-variant text-on-surface px-md py-sm rounded-lg font-bold hover:bg-secondary-container/50 transition-all active:scale-95 text-xs uppercase"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Exportar CSV
          </button>
        </div>
      </section>

      {/* Tabs Switcher */}
      <div className="flex border-b border-outline-variant/20 gap-md">
        {["dashboard", "transactions", "expenses"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-sm font-label-md text-label-md uppercase tracking-wider relative transition-all ${
              activeTab === tab ? "text-tertiary font-bold" : "text-outline hover:text-on-surface"
            }`}
          >
            {tab === "dashboard" ? "Painel" : tab === "transactions" ? "Entradas / Receitas" : "Saídas / Despesas"}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-tertiary rounded-full animate-scale-in"></span>
            )}
          </button>
        ))}
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeTab === "dashboard" && (
        <div className="space-y-md">
          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            
            {/* Receitas */}
            <div className="glass-card p-md rounded-xl space-y-base border-l-4 border-green-500">
              <span className="text-outline font-label-md text-label-md uppercase tracking-wider block">Receita Bruta</span>
              <div className="flex justify-between items-baseline">
                <h3 className="font-headline-lg text-headline-lg text-on-surface">R$ {summary.revenue.toLocaleString()}</h3>
                <span className="material-symbols-outlined text-green-500 text-3xl">trending_up</span>
              </div>
              <p className="text-[11px] text-on-surface-variant">Total faturado no período corrente.</p>
            </div>

            {/* Despesas */}
            <div className="glass-card p-md rounded-xl space-y-base border-l-4 border-error">
              <span className="text-outline font-label-md text-label-md uppercase tracking-wider block">Despesas Totais</span>
              <div className="flex justify-between items-baseline">
                <h3 className="font-headline-lg text-headline-lg text-on-surface">R$ {summary.expenses.toLocaleString()}</h3>
                <span className="material-symbols-outlined text-error text-3xl">trending_down</span>
              </div>
              <p className="text-[11px] text-on-surface-variant">Fixo: R$ {summary.fixedExpenses} | Variável: R$ {summary.variableExpenses}</p>
            </div>

            {/* Lucro Líquido */}
            <div className="glass-card p-md rounded-xl space-y-base border-l-4 border-tertiary">
              <span className="text-outline font-label-md text-label-md uppercase tracking-wider block">Lucro Líquido</span>
              <div className="flex justify-between items-baseline">
                <h3 className={`font-headline-lg text-headline-lg ${summary.netProfit >= 0 ? "text-on-surface" : "text-error"}`}>
                  R$ {summary.netProfit.toLocaleString()}
                </h3>
                <span className="material-symbols-outlined text-tertiary text-3xl">payments</span>
              </div>
              <p className="text-[11px] text-on-surface-variant">Projeção do mês: R$ {Math.round(summary.projection).toLocaleString()}</p>
            </div>

          </div>

          {/* Gráficos e Ranking */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
            
            {/* Gráfico de Barras Mensal */}
            <div className="lg:col-span-8 glass-card p-md rounded-xl space-y-md">
              <h3 className="font-headline-md text-headline-md text-on-surface">Receita vs Despesas (Últimos 6 Meses)</h3>
              <div className="h-56 flex items-end justify-between gap-base px-md pt-6">
                {summary.chartData.map((data, index) => {
                  const revHeight = (data.revenue / 15000) * 100;
                  const expHeight = (data.expenses / 15000) * 100;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-xs">
                      <div className="w-full flex items-end justify-center gap-[4px] h-40">
                        {/* Receita (Verde/Claro) */}
                        <div 
                          className="w-3 md:w-5 bg-green-500/80 rounded-t-sm shadow-md"
                          style={{ height: `${revHeight}%` }}
                          title={`Receita: R$ ${data.revenue}`}
                        />
                        {/* Despesa (Vermelho Ferrari) */}
                        <div 
                          className="w-3 md:w-5 bg-tertiary rounded-t-sm shadow-md"
                          style={{ height: `${expHeight}%` }}
                          title={`Despesa: R$ ${data.expenses}`}
                        />
                      </div>
                      <span className="text-label-sm text-on-surface-variant font-bold text-[10px]">{data.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ranking dos Profissionais */}
            <div className="lg:col-span-4 glass-card p-md rounded-xl space-y-md">
              <h3 className="font-headline-md text-headline-md text-on-surface">Faturamento por Barbeiro</h3>
              <div className="space-y-sm">
                {summary.barberRanking && summary.barberRanking.length > 0 ? (
                  summary.barberRanking.map((barber, index) => (
                    <div key={index} className="flex items-center justify-between p-sm bg-surface-container rounded-lg border border-outline-variant/10">
                      <div className="flex items-center gap-sm">
                        <div className="w-8 h-8 rounded-full bg-tertiary/10 flex items-center justify-center font-bold text-tertiary text-xs">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-label-md font-bold text-on-surface">{barber.name}</p>
                          <p className="text-[10px] text-on-surface-variant uppercase">{barber.cuts} cortes</p>
                        </div>
                      </div>
                      <span className="font-bold text-sm text-tertiary">R$ {barber.revenue}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-on-surface-variant italic py-sm text-center">Nenhum dado de barbeiro disponível.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {activeTab === "transactions" && (
        <div className="space-y-md">
          {/* Header de Ações */}
          <div className="flex justify-between items-center">
            <h3 className="font-headline-md text-headline-md text-on-surface">Histórico de Receitas</h3>
            <button
              onClick={() => setShowTxForm(!showTxForm)}
              className="bg-tertiary text-on-tertiary font-bold px-4 py-2 rounded-lg text-xs uppercase flex items-center gap-1 active:scale-95 transition-all shadow-md shadow-tertiary/15"
            >
              <span className="material-symbols-outlined text-sm">{showTxForm ? "close" : "add"}</span>
              {showTxForm ? "Fechar" : "Lançar Receita"}
            </button>
          </div>

          {/* Form Lançamento */}
          {showTxForm && (
            <form onSubmit={handleCreateTx} className="glass-card p-md rounded-xl grid grid-cols-1 md:grid-cols-4 gap-sm items-end border border-tertiary/20 animate-scale-in">
              <div className="space-y-xs">
                <label className="text-label-sm text-outline uppercase tracking-wider text-[10px]">Descrição *</label>
                <input
                  type="text"
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                  placeholder="Ex: Venda Pomada Modeladora"
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-sm text-xs text-on-surface focus:outline-none"
                  required
                />
              </div>
              <div className="space-y-xs">
                <label className="text-label-sm text-outline uppercase tracking-wider text-[10px]">Valor (R$) *</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.01"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  placeholder="50.00"
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-sm text-xs text-on-surface focus:outline-none"
                  required
                />
              </div>
              <div className="space-y-xs">
                <label className="text-label-sm text-outline uppercase tracking-wider text-[10px]">Categoria</label>
                <select
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-sm text-xs text-on-surface focus:outline-none"
                >
                  <option value="product">Venda de Produto</option>
                  <option value="appointment">Serviço / Agendamento</option>
                  <option value="other">Outros</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="bg-tertiary text-on-tertiary font-bold py-3 rounded-lg text-xs uppercase shadow-md active:scale-95 transition-transform"
              >
                {saving ? "Registrando..." : "Lançar Entrada"}
              </button>
            </form>
          )}

          {/* Listagem */}
          <div className="glass-card rounded-xl overflow-hidden border border-outline-variant/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-variant/50 text-label-sm uppercase font-bold text-on-surface-variant">
                  <tr>
                    <th className="px-md py-sm">Data</th>
                    <th className="px-md py-sm">Descrição</th>
                    <th className="px-md py-sm">Categoria</th>
                    <th className="px-md py-sm">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-surface-variant/20 transition-colors">
                      <td className="px-md py-md text-xs font-mono text-outline">{tx.date}</td>
                      <td className="px-md py-md font-bold text-on-surface">{tx.description}</td>
                      <td className="px-md py-md">
                        <span className="bg-green-500/10 text-green-400 text-[10px] px-2 py-0.5 rounded-full border border-green-500/20 uppercase tracking-tighter">
                          {tx.category === "appointment" ? "Serviço" : tx.category === "product" ? "Produto" : "Outros"}
                        </span>
                      </td>
                      <td className="px-md py-md text-green-400 font-bold">R$ {tx.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "expenses" && (
        <div className="space-y-md">
          {/* Header de Ações */}
          <div className="flex justify-between items-center">
            <h3 className="font-headline-md text-headline-md text-on-surface">Histórico de Saídas / Despesas</h3>
            <button
              onClick={() => setShowExpForm(!showExpForm)}
              className="bg-tertiary text-on-tertiary font-bold px-4 py-2 rounded-lg text-xs uppercase flex items-center gap-1 active:scale-95 transition-all shadow-md shadow-tertiary/15"
            >
              <span className="material-symbols-outlined text-sm">{showExpForm ? "close" : "add"}</span>
              {showExpForm ? "Fechar" : "Lançar Despesa"}
            </button>
          </div>

          {/* Form Lançamento */}
          {showExpForm && (
            <form onSubmit={handleCreateExp} className="glass-card p-md rounded-xl grid grid-cols-1 md:grid-cols-5 gap-sm items-end border border-tertiary/20 animate-scale-in">
              <div className="space-y-xs">
                <label className="text-label-sm text-outline uppercase tracking-wider text-[10px]">Descrição *</label>
                <input
                  type="text"
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  placeholder="Ex: Aluguel Batel"
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-sm text-xs text-on-surface focus:outline-none"
                  required
                />
              </div>
              <div className="space-y-xs">
                <label className="text-label-sm text-outline uppercase tracking-wider text-[10px]">Valor (R$) *</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.01"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  placeholder="250.00"
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-sm text-xs text-on-surface focus:outline-none"
                  required
                />
              </div>
              <div className="space-y-xs">
                <label className="text-label-sm text-outline uppercase tracking-wider text-[10px]">Categoria</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-sm text-xs text-on-surface focus:outline-none"
                >
                  <option value="fixed">Despesa Fixa (Mensal)</option>
                  <option value="variable">Despesa Variável</option>
                  <option value="investment">Investimento</option>
                </select>
              </div>
              <div className="flex items-center gap-xs pb-md cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={expRecurring}
                  onChange={(e) => setExpRecurring(e.target.checked)}
                  className="rounded border-outline-variant/30 text-tertiary focus:ring-tertiary"
                />
                <label htmlFor="recurring" className="text-xs text-on-surface-variant cursor-pointer">Recorrência Mensal</label>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="bg-tertiary text-on-tertiary font-bold py-3 rounded-lg text-xs uppercase shadow-md active:scale-95 transition-transform"
              >
                {saving ? "Registrando..." : "Lançar Saída"}
              </button>
            </form>
          )}

          {/* Listagem */}
          <div className="glass-card rounded-xl overflow-hidden border border-outline-variant/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-variant/50 text-label-sm uppercase font-bold text-on-surface-variant">
                  <tr>
                    <th className="px-md py-sm">Data</th>
                    <th className="px-md py-sm">Descrição</th>
                    <th className="px-md py-sm">Categoria</th>
                    <th className="px-md py-sm">Recorrência</th>
                    <th className="px-md py-sm">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-surface-variant/20 transition-colors">
                      <td className="px-md py-md text-xs font-mono text-outline">{exp.date}</td>
                      <td className="px-md py-md font-bold text-on-surface">{exp.description}</td>
                      <td className="px-md py-md">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-tighter ${
                          exp.category === "fixed" ? "bg-red-500/10 border-red-500/20 text-red-400" :
                          exp.category === "variable" ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" :
                          "bg-blue-500/10 border-blue-500/20 text-blue-400"
                        }`}>
                          {exp.category === "fixed" ? "Fixa" : exp.category === "variable" ? "Variável" : "Investimento"}
                        </span>
                      </td>
                      <td className="px-md py-md text-xs text-on-surface-variant">
                        {exp.recurring ? "🔁 Mensal" : "1x Única"}
                      </td>
                      <td className="px-md py-md text-red-400 font-bold">R$ {exp.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
