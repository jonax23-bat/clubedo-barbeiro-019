import React, { useState, useEffect, useRef } from "react";
import { dbService } from "../firebase/dbService";

export default function ManageStore({ user, navigateTo }) {
  const fileInputRef = useRef(null);
  const [storeItems, setStoreItems] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tabs: catalog | deliveries
  const [activeTab, setActiveTab] = useState("catalog");

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadType, setUploadType] = useState("file"); // file | url
  const [category, setCategory] = useState("products");
  const [stock, setStock] = useState("");
  
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [coinRatio, setCoinRatio] = useState(12.5);

  useEffect(() => {
    loadStoreData();
  }, []);

  const loadStoreData = async () => {
    setLoading(true);
    try {
      const items = await dbService.getStoreItems();
      const allRedemptions = await dbService.getRedemptions();
      setStoreItems(items);
      setRedemptions(allRedemptions);
      const ratio = await dbService.getCoinConversionRatio();
      setCoinRatio(ratio);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setName("");
    setPrice("");
    setSellingPrice("");
    setDescription("");
    setImageUrl("");
    setUploadType("file");
    setCategory("products");
    setStock("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setName(item.name);
    setPrice(item.price);
    setSellingPrice(item.sellingPrice || Math.round(item.price / coinRatio));
    setDescription(item.description);
    setImageUrl(item.imageUrl);
    setUploadType(item.imageUrl?.startsWith("data:") ? "file" : "url");
    setCategory(item.category);
    setStock(item.stock);
    setIsFormOpen(true);
  };

  const handleToggleActive = async (item) => {
    const updatedStatus = !item.active;
    await dbService.updateStoreItem(item.id, { active: updatedStatus });
    loadStoreData();
  };

  const handleConfirmDelivery = async (redemptionId) => {
    if (confirm("Confirmar a entrega física deste produto ao cliente?")) {
      await dbService.confirmDelivery(redemptionId);
      loadStoreData();
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim() || !price || !stock) return;

    setSaving(true);
    setSaveStatus(null);

    const itemData = {
      name,
      price: parseInt(price),
      sellingPrice: parseFloat(sellingPrice) || 0,
      description,
      imageUrl: imageUrl.trim() || "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=150&auto=format&fit=crop&q=60",
      category,
      stock: parseInt(stock)
    };

    try {
      if (editingItem) {
        await dbService.updateStoreItem(editingItem.id, itemData);
      } else {
        await dbService.createStoreItem(itemData);
      }
      setSaveStatus("success");
      setTimeout(() => {
        setIsFormOpen(false);
        setSaveStatus(null);
        loadStoreData();
      }, 1000);
    } catch (err) {
      console.error(err);
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-2xl">
        <span className="material-symbols-outlined animate-spin text-tertiary text-4xl">sync</span>
      </div>
    );
  }

  const pendingDeliveries = redemptions.filter(r => r.status === "pending");
  const totalCoinsCirculated = redemptions.reduce((sum, r) => sum + r.itemPrice, 0);

  return (
    <div className="max-w-[1000px] mx-auto space-y-lg">
      
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg mb-xs text-on-surface">Gestão da Loja do Clube</h2>
          <p className="text-on-surface-variant font-body-md">
            Cadastre recompensas, monitore o estoque e confirme resgates físicos de Coins.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-surface-container p-[4px] rounded-xl border border-outline-variant/15 self-stretch sm:self-auto shrink-0">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`flex-1 sm:flex-none px-md py-sm rounded-lg font-headline-md text-headline-md transition-all ${
              activeTab === "catalog" ? "bg-tertiary text-on-tertiary shadow" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Catálogo / Itens
          </button>
          <button
            onClick={() => setActiveTab("deliveries")}
            className={`flex-1 sm:flex-none px-md py-sm rounded-lg font-headline-md text-headline-md transition-all relative ${
              activeTab === "deliveries" ? "bg-tertiary text-on-tertiary shadow" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Entregas Pendentes
            {pendingDeliveries.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold">
                {pendingDeliveries.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Bento Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-md">
        <div className="bg-surface-container p-md rounded-2xl border border-outline-variant/10 shadow-md">
          <span className="text-label-sm font-label-sm text-on-surface-variant uppercase">Entregas Pendentes</span>
          <h3 className="text-display-lg font-display-lg text-on-surface mt-sm">{pendingDeliveries.length} resgates</h3>
          <p className="text-xs text-on-surface-variant">Aguardando retirada no balcão</p>
        </div>

        <div className="bg-surface-container p-md rounded-2xl border border-outline-variant/10 shadow-md">
          <span className="text-label-sm font-label-sm text-on-surface-variant uppercase">Coins em Circulação</span>
          <h3 className="text-display-lg font-display-lg text-tertiary mt-sm">🪙 {totalCoinsCirculated}</h3>
          <p className="text-xs text-on-surface-variant">Investidos em resgates totais</p>
        </div>

        <div className="bg-surface-container p-md rounded-2xl border border-outline-variant/10 shadow-md">
          <span className="text-label-sm font-label-sm text-on-surface-variant uppercase">Prêmio mais Resgatado</span>
          <h3 className="text-headline-md text-headline-md text-on-surface mt-sm font-bold truncate">
            {redemptions.length > 0 ? redemptions[0].itemName : "Nenhum ainda"}
          </h3>
          <p className="text-xs text-on-surface-variant">Preferido dos membros</p>
        </div>
      </section>

      {activeTab === "catalog" && (
        <div className="space-y-md">
          <div className="flex justify-between items-center">
            <h3 className="font-headline-md text-headline-md text-on-surface">Vitrine Cadastrada ({storeItems.length})</h3>
            <button
              onClick={handleOpenCreate}
              className="bg-tertiary text-on-tertiary px-lg py-md rounded-xl font-headline-md text-headline-md flex items-center gap-sm active:scale-95 transition-all shadow-md"
            >
              <span className="material-symbols-outlined">add</span>
              Cadastrar Item
            </button>
          </div>

          {/* Form modal */}
          {isFormOpen && (
            <div className="bg-surface-container p-lg rounded-2xl border border-outline-variant/20 shadow-2xl animate-scale-in">
              <h4 className="font-headline-md text-headline-md text-on-surface mb-lg">
                {editingItem ? "Editar Item" : "Cadastrar Novo Item"}
              </h4>
              <form onSubmit={handleSave} className="space-y-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  <div className="space-y-xs">
                    <label className="text-label-sm font-label-sm text-on-surface-variant uppercase">Nome do Prêmio *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Pomada Modeladora Matte"
                      className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-md py-sm text-on-surface focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-sm">
                    <div className="space-y-xs">
                      <label className="text-label-sm font-label-sm text-on-surface-variant uppercase text-[10px]">Venda (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={sellingPrice}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSellingPrice(val);
                          if (val && !isNaN(val)) {
                            setPrice(Math.round(parseFloat(val) * coinRatio));
                          }
                        }}
                        placeholder="8.00"
                        className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-md py-sm text-on-surface focus:outline-none"
                      />
                    </div>
                    <div className="space-y-xs">
                      <label className="text-label-sm font-label-sm text-on-surface-variant uppercase text-[10px]">Coins *</label>
                      <input
                        type="number"
                        required
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="100"
                        className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-md py-sm text-on-surface focus:outline-none"
                      />
                    </div>
                    <div className="space-y-xs">
                      <label className="text-label-sm font-label-sm text-on-surface-variant uppercase text-[10px]">Estoque *</label>
                      <input
                        type="number"
                        required
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        placeholder="10"
                        className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-md py-sm text-on-surface focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {sellingPrice && (
                  <p className="text-[11px] text-tertiary font-semibold flex items-center gap-[4px] bg-tertiary/5 border border-tertiary/10 p-sm rounded-lg">
                    <span className="material-symbols-outlined text-[14px]">info</span>
                    <span>Sugestão de Margem: <strong>{Math.round(parseFloat(sellingPrice) * coinRatio)} Coins</strong> (proporção sustentável de {coinRatio} pontos por R$ de balcão).</span>
                  </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  <div className="space-y-xs">
                    <label className="text-label-sm font-label-sm text-on-surface-variant uppercase">Categoria</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-sm text-on-surface focus:outline-none"
                    >
                      <option value="products">Produtos Físicos</option>
                      <option value="discounts">Descontos / Cupons</option>
                      <option value="experiences">Experiências / Consumos</option>
                    </select>
                  </div>

                  <div className="space-y-xs">
                    <label className="text-label-sm font-label-sm text-on-surface-variant uppercase block">Imagem do Prêmio</label>
                    <div className="flex gap-sm">
                      <button
                        type="button"
                        onClick={() => { setUploadType("file"); }}
                        className={`px-sm py-1.5 rounded-lg border text-xs font-semibold ${
                          uploadType === "file" 
                            ? "bg-tertiary/10 border-tertiary text-tertiary" 
                            : "bg-surface-container-lowest border-outline-variant/20 text-on-surface-variant"
                        }`}
                      >
                        Enviar Arquivo
                      </button>
                      <button
                        type="button"
                        onClick={() => { setUploadType("url"); }}
                        className={`px-sm py-1.5 rounded-lg border text-xs font-semibold ${
                          uploadType === "url" 
                            ? "bg-tertiary/10 border-tertiary text-tertiary" 
                            : "bg-surface-container-lowest border-outline-variant/20 text-on-surface-variant"
                        }`}
                      >
                        URL da Imagem
                      </button>
                    </div>

                    {uploadType === "file" ? (
                      <div className="flex flex-col gap-xs mt-xs">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              if (file.size > 2 * 1024 * 1024) {
                                alert("A imagem é muito grande! Escolha um arquivo de até 2MB.");
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                try {
                                  const uploadedUrl = await dbService.uploadImage(reader.result, "store_product");
                                  setImageUrl(uploadedUrl);
                                } catch (err) {
                                  console.error("Upload error", err);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current && fileInputRef.current.click()}
                          className="w-full bg-surface-container-lowest border border-outline-variant/30 hover:border-tertiary hover:bg-tertiary/5 text-on-surface rounded-xl p-md flex flex-col items-center justify-center gap-xs transition-all group cursor-pointer border-dashed min-h-[90px]"
                        >
                          <span className="material-symbols-outlined text-tertiary text-2xl group-hover:scale-110 transition-transform">cloud_upload</span>
                          <span className="font-label-md text-xs text-on-surface-variant font-bold uppercase tracking-wider">Selecionar Foto</span>
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={imageUrl.startsWith("data:") ? "" : imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://exemplo.com/imagem.jpg"
                        className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-md py-sm text-on-surface focus:outline-none mt-xs text-xs"
                      />
                    )}

                    {imageUrl && (
                      <div className="mt-xs flex items-center gap-sm">
                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-outline-variant/20 bg-surface-container-lowest">
                          <img src={imageUrl} alt="Prévia" className="w-full h-full object-cover" />
                        </div>
                        <button
                          type="button"
                          onClick={() => setImageUrl("")}
                          className="text-xs text-error font-bold hover:underline flex items-center gap-xs"
                        >
                          <span className="material-symbols-outlined text-xs">close</span> Remover Imagem
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-xs">
                  <label className="text-label-sm font-label-sm text-on-surface-variant uppercase">Descrição</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Diga detalhes sobre a recompensa..."
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-sm text-on-surface focus:outline-none"
                    rows="2"
                  />
                </div>

                <div className="flex gap-md pt-md">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-tertiary text-on-tertiary py-md rounded-xl font-headline-md text-headline-md flex items-center justify-center gap-xs active:scale-95 transition-all shadow-md"
                  >
                    {saving ? (
                      <>
                        <span className="material-symbols-outlined animate-spin">sync</span>
                        Salvando...
                      </>
                    ) : saveStatus === "success" ? (
                      <>
                        <span className="material-symbols-outlined text-green-400">check_circle</span>
                        Salvo!
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">save</span>
                        Salvar Item
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-lg py-md border border-outline-variant/30 text-on-surface rounded-xl font-headline-md text-headline-md hover:bg-surface-variant active:scale-95"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Grid de Itens */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
            {storeItems.map(item => (
              <div 
                key={item.id}
                className="bg-surface-container p-md rounded-2xl border border-outline-variant/10 flex flex-col justify-between shadow-md"
              >
                <div className="space-y-sm">
                  <div className="h-32 rounded-xl overflow-hidden relative border border-outline-variant/10">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 bg-black/60 px-2 py-0.5 rounded text-xs text-tertiary font-bold">
                      🪙 {item.price}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between gap-sm">
                      <h4 className="font-bold text-on-surface text-body-lg truncate">{item.name}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        item.active ? "bg-green-500/10 text-green-400" : "bg-outline/20 text-outline"
                      }`}>
                        {item.active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant line-clamp-2 mt-xs h-8 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex justify-between text-label-sm font-label-sm border-t border-outline-variant/10 pt-xs">
                    <span className="text-on-surface-variant">Estoque</span>
                    <span className="text-on-surface font-bold">
                      {item.stock >= 999 ? "Ilimitado" : `${item.stock} un`}
                    </span>
                  </div>
                </div>

                <div className="flex gap-sm mt-md pt-xs border-t border-outline-variant/10">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="flex-1 bg-surface-container-highest border border-outline-variant/30 py-sm rounded-lg hover:bg-surface-variant transition-colors flex items-center justify-center gap-xs font-headline-md text-headline-md"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    Editar
                  </button>
                  <button
                    onClick={() => handleToggleActive(item)}
                    className={`flex-1 py-sm rounded-lg border font-bold text-xs transition-colors ${
                      item.active 
                        ? "bg-red-500/5 border-red-500/20 text-red-400 hover:bg-red-500/10" 
                        : "bg-green-500/5 border-green-500/20 text-green-400 hover:bg-green-500/10"
                    }`}
                  >
                    {item.active ? "Desativar" : "Ativar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "deliveries" && (
        <section className="bg-surface-container p-md rounded-2xl border border-outline-variant/10 space-y-md">
          <h3 className="font-headline-md text-headline-md text-on-surface">Resgates Pendentes</h3>
          {pendingDeliveries.length > 0 ? (
            <div className="divide-y divide-outline-variant/10 text-body-md">
              {pendingDeliveries.map(r => (
                <div key={r.id} className="py-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-sm">
                  <div>
                    <h4 className="font-bold text-on-surface text-body-lg">
                      {r.itemName} <span className="text-xs text-tertiary">(-{r.itemPrice} 🪙)</span>
                    </h4>
                    <p className="text-xs text-on-surface-variant">
                      Cliente: <strong>{r.userName}</strong> | Resgatado em {new Date(r.date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleConfirmDelivery(r.id)}
                    className="w-full sm:w-auto bg-green-500 text-white px-md py-sm rounded-lg font-bold text-xs uppercase hover:brightness-110 active:scale-95 transition-all"
                  >
                    Entregar Produto
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant italic py-sm">Nenhum resgate pendente de entrega no momento.</p>
          )}
        </section>
      )}

    </div>
  );
}
