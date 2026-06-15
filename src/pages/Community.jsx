import React, { useState, useEffect } from "react";
import { dbService } from "../firebase/dbService";

export default function Community({ user, navigateTo, refreshUser }) {
  // --- Estados do Componente ---
  const [posts, setPosts] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [newPostText, setNewPostText] = useState("");
  const [creatingPost, setCreatingPost] = useState(false);
  const [usersMap, setUsersMap] = useState({});

  // Estados de comentários
  const [activeCommentsPostId, setActiveCommentsPostId] = useState(null);
  const [activePostComments, setActivePostComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState("");

  // --- Efeito: Carrega dados do Banco/LocalStorage ---
  const loadAllData = async () => {
    const p = await dbService.getPosts();
    setPosts(p);
    
    const l = await dbService.getLeaderboard();
    setLeaderboard(l);

    // Carrega os dados de nível de todos os usuários para exibição de badges
    try {
      const allUsers = await dbService.getUsers();
      const map = {};
      allUsers.forEach(u => {
        const lvlInfo = dbService.getUserLevel(u);
        map[u.uid] = lvlInfo;
        map[u.name] = lvlInfo;
      });
      setUsersMap(map);
    } catch (e) {
      console.error("Erro ao carregar usuários e níveis", e);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [user]);

  const renderUserLevelBadge = (authorId, authorName) => {
    const info = usersMap[authorId] || usersMap[authorName];
    if (!info) return null;
    return (
      <span className="inline-flex items-center gap-1 bg-tertiary-container/20 text-tertiary border border-tertiary/20 text-[10px] px-2 py-0.5 rounded-full font-bold ml-2">
        <span>{info.badge}</span>
        <span>{info.nome}</span>
      </span>
    );
  };

  // --- Função para Curtir Post ---
  const handleLike = async (postId) => {
    try {
      const updatedLikes = await dbService.likePost(postId, user.uid);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: updatedLikes } : p));
    } catch (e) {
      console.error(e);
    }
  };

  // --- Função para Reagir ao Post com Emojis ---
  const handleReactToPost = async (postId, reactionType) => {
    try {
      const localPosts = localStorage.getItem("clubber_posts") ? JSON.parse(localStorage.getItem("clubber_posts")) : posts;
      const updated = localPosts.map(p => {
        if (p.id === postId) {
          const reactions = p.reactions || {};
          const uids = reactions[reactionType] || [];
          const updatedUids = uids.includes(user.uid)
            ? uids.filter(uid => uid !== user.uid)
            : [...uids, user.uid];
          return {
            ...p,
            reactions: {
              ...reactions,
              [reactionType]: updatedUids
            }
          };
        }
        return p;
      });
      localStorage.setItem("clubber_posts", JSON.stringify(updated));
      setPosts(prev => prev.map(p => {
        const matching = updated.find(item => item.id === p.id);
        return matching ? matching : p;
      }));
    } catch (e) {
      console.error("Erro ao reagir ao post:", e);
    }
  };

  // --- Função para Reagir ao Comentário com Emojis ---
  const handleReactToComment = async (commentId, reactionType) => {
    try {
      const localComments = localStorage.getItem("clubber_comments") ? JSON.parse(localStorage.getItem("clubber_comments")) : [];
      const updated = localComments.map(c => {
        if (c.id === commentId) {
          const reactions = c.reactions || {};
          const uids = reactions[reactionType] || [];
          const updatedUids = uids.includes(user.uid)
            ? uids.filter(uid => uid !== user.uid)
            : [...uids, user.uid];
          return {
            ...c,
            reactions: {
              ...reactions,
              [reactionType]: updatedUids
            }
          };
        }
        return c;
      });
      localStorage.setItem("clubber_comments", JSON.stringify(updated));

      // Atualiza o estado local dos comentários do post aberto
      setActivePostComments(prev => prev.map(c => {
        if (c.id === commentId) {
          const reactions = c.reactions || {};
          const uids = reactions[reactionType] || [];
          const updatedUids = uids.includes(user.uid)
            ? uids.filter(uid => uid !== user.uid)
            : [...uids, user.uid];
          return {
            ...c,
            reactions: {
              ...reactions,
              [reactionType]: updatedUids
            }
          };
        }
        return c;
      }));
    } catch (e) {
      console.error("Erro ao reagir ao comentário:", e);
    }
  };

  // --- Funções de Comentários ---
  const handleToggleComments = async (postId) => {
    if (activeCommentsPostId === postId) {
      setActiveCommentsPostId(null);
      setActivePostComments([]);
    } else {
      setActiveCommentsPostId(postId);
      const comments = await dbService.getComments(postId);
      setActivePostComments(comments);
      setNewCommentText("");
    }
  };

  const handleAddComment = async (e, postId) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    try {
      const newComment = await dbService.createComment(
        postId,
        user.uid,
        user.name,
        user.avatarUrl,
        newCommentText
      );
      setActivePostComments(prev => [...prev, newComment]);
      setNewCommentText("");

      // Atualiza o commentsCount na lista de posts local
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return { ...p, commentsCount: (p.commentsCount || 0) + 1 };
        }
        return p;
      }));
    } catch (err) {
      console.error("Erro ao adicionar comentário", err);
    }
  };

  // --- Criar Postagem no Feed ---
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostText.trim()) return;

    setCreatingPost(true);
    try {
      const newPost = await dbService.createPost({
        authorUid: user.uid,
        authorName: user.name,
        authorAvatar: user.avatarUrl || null,
        content: newPostText,
        isOfficial: false
      });
      setPosts(prev => [newPost, ...prev]);
      setNewPostText("");
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingPost(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-md">
      
      {/* Coluna Esquerda: Feed Principal */}
      <div className="lg:col-span-8 space-y-md">
        
        {/* Escrever Nova Publicação */}
        <section className="glass-card rounded-xl p-md">
          <form onSubmit={handleCreatePost} className="space-y-4">
            <h3 className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant">Compartilhe na Comunidade</h3>
            <textarea
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
              placeholder="O que está pensando hoje sobre o estilo?"
              className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-md text-on-surface focus:outline-none focus:border-tertiary focus:ring-1 focus:ring-tertiary transition-all"
              rows="3"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creatingPost || !newPostText.trim()}
                className="bg-surface-container-highest border border-outline-variant/30 text-on-surface hover:bg-surface-bright px-md py-2 rounded-lg font-label-md text-label-md active:scale-95 duration-150 transition-all flex items-center gap-xs disabled:opacity-50"
              >
                {creatingPost ? "Publicando..." : "Publicar"}
              </button>
            </div>
          </form>
        </section>

        {/* Feed de Posts */}
        <div className="space-y-md">
          {posts.map((post) => {
            const hasLiked = post.likes && Array.isArray(post.likes) ? post.likes.includes(user.uid) : false;

            return (
              <article key={post.id} className="glass-card rounded-xl overflow-hidden">
                <div className="p-md flex items-center gap-sm">
                  {post.authorAvatar ? (
                    <div className="w-10 h-10 rounded-full overflow-hidden">
                      <img src={post.authorAvatar} alt={post.authorName} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-tertiary flex items-center justify-center text-on-tertiary">
                      <span className="material-symbols-outlined">
                        {post.isOfficial ? "content_cut" : "person"}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-label-md text-label-md text-on-surface font-semibold flex items-center flex-wrap">
                      <span>{post.authorName}</span>
                      {!post.isOfficial && renderUserLevelBadge(post.authorUid, post.authorName)}
                      <span className="text-on-surface-variant font-normal ml-2">
                        • {new Date(post.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </p>
                    {post.isOfficial && <p className="text-tertiary text-xs">Atualização Oficial</p>}
                  </div>
                </div>

                <div className="px-md pb-md">
                  <p className="font-body-md text-on-surface-variant">{post.content}</p>
                </div>

                {post.imageUrl && (
                  <div className="relative h-64 overflow-hidden border-t border-b border-outline-variant/10">
                    <img src={post.imageUrl} alt="Post media" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="p-md flex items-center justify-between border-t border-outline-variant/20">
                  <div className="flex gap-md items-center flex-wrap">
                    {/* Botões de Reações com Emojis */}
                    {[
                      { type: "like", emoji: "👍", label: "Gostei" },
                      { type: "love", emoji: "❤️", label: "Amei" },
                      { type: "fire", emoji: "🔥", label: "Brabo" },
                      { type: "style", emoji: "✂️", label: "Estilo" }
                    ].map(react => {
                      const pReactions = post.reactions || {};
                      const usersList = pReactions[react.type] || [];
                      const hasReacted = usersList.includes(user.uid);
                      return (
                        <button
                          key={react.type}
                          onClick={() => handleReactToPost(post.id, react.type)}
                          className={`flex items-center gap-xs px-2.5 py-1 rounded-full text-xs transition-all border ${
                            hasReacted 
                              ? "bg-tertiary/15 border-tertiary text-tertiary font-bold" 
                              : "bg-surface-variant/40 border-transparent text-on-surface-variant hover:bg-surface-variant"
                          }`}
                          title={react.label}
                        >
                          <span>{react.emoji}</span>
                          {usersList.length > 0 && <span className="text-[10px]">{usersList.length}</span>}
                        </button>
                      );
                    })}

                    <div className="w-[1px] bg-outline-variant/30 h-4 mx-xs"></div>
                    
                    <button 
                      onClick={() => handleToggleComments(post.id)}
                      className={`flex items-center gap-xs hover:text-tertiary transition-colors ${
                        activeCommentsPostId === post.id ? "text-tertiary" : "text-on-surface-variant"
                      }`}
                    >
                      <span className="material-symbols-outlined text-md">chat_bubble</span>
                      <span className="font-label-sm">{post.commentsCount || 0}</span>
                    </button>
                  </div>
                  
                  <button className="text-on-surface-variant hover:text-tertiary transition-colors">
                    <span className="material-symbols-outlined">share</span>
                  </button>
                </div>

                {/* Painel de Comentários */}
                {activeCommentsPostId === post.id && (
                  <div className="border-t border-outline-variant/20 p-md bg-surface-container-low/40 space-y-md">
                    <h4 className="font-label-sm font-bold text-outline uppercase tracking-wider text-xs">
                      Comentários
                    </h4>
                    
                    <div className="space-y-sm max-h-60 overflow-y-auto custom-scrollbar pr-xs">
                      {activePostComments.length === 0 ? (
                        <p className="text-xs text-on-surface-variant italic">Nenhum comentário ainda. Seja o primeiro a comentar!</p>
                      ) : (
                        activePostComments.map((comment) => (
                          <div key={comment.id} className="flex gap-sm items-start text-xs bg-surface-container/50 p-sm rounded-lg border border-outline-variant/5">
                            {comment.authorAvatar ? (
                              <img src={comment.authorAvatar} alt={comment.authorName} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-tertiary flex items-center justify-center text-on-tertiary">
                                <span className="material-symbols-outlined text-sm">person</span>
                              </div>
                            )}
                            <div className="flex-1 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-on-surface flex items-center flex-wrap">
                                  <span>{comment.authorName}</span>
                                  {renderUserLevelBadge(comment.authorUid, comment.authorName)}
                                </span>
                                <span className="text-[10px] text-outline">
                                  {new Date(comment.createdAt).toLocaleDateString("pt-BR")} às {new Date(comment.createdAt).toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'})}
                                </span>
                              </div>
                              <p className="text-on-surface-variant text-xs">{comment.content}</p>
                              
                              {/* Reações nos Comentários */}
                              <div className="flex gap-xs items-center pt-xs flex-wrap">
                                {[
                                  { type: "like", emoji: "👍" },
                                  { type: "love", emoji: "❤️" },
                                  { type: "fire", emoji: "🔥" }
                                ].map(react => {
                                  const cReactions = comment.reactions || {};
                                  const usersList = cReactions[react.type] || [];
                                  const hasReacted = usersList.includes(user.uid);
                                  return (
                                    <button
                                      key={react.type}
                                      onClick={() => handleReactToComment(comment.id, react.type)}
                                      className={`flex items-center justify-center gap-[2px] px-2 py-0.5 rounded-full text-[10px] transition-all border ${
                                        hasReacted 
                                          ? "bg-tertiary/20 border-tertiary text-tertiary font-bold" 
                                          : "bg-surface-container-low border-transparent text-outline hover:bg-surface-container-high"
                                      }`}
                                    >
                                      <span>{react.emoji}</span>
                                      {usersList.length > 0 && <span>{usersList.length}</span>}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Formulário de Envio de Comentário */}
                    <form onSubmit={(e) => handleAddComment(e, post.id)} className="flex gap-sm">
                      <input
                        type="text"
                        placeholder="Escreva um comentário..."
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        className="flex-1 bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-md py-2 text-xs text-on-surface focus:outline-none focus:border-tertiary"
                        required
                      />
                      <button
                        type="submit"
                        className="bg-tertiary text-on-tertiary px-md py-2 rounded-lg text-xs font-bold uppercase hover:brightness-110 active:scale-95 transition-all"
                      >
                        Comentar
                      </button>
                    </form>
                  </div>
                )}
              </article>
            );
          })}
        </div>

      </div>

      {/* Coluna Direita: Ranking Geral de XP (Leaderboard) */}
      <div className="lg:col-span-4 space-y-md sticky top-24 h-fit">
        <section className="glass-card rounded-xl p-md space-y-lg">
          <h3 className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant">
            Ranking de XP (Geral)
          </h3>

          <div className="space-y-lg">
            {leaderboard.map((member, index) => {
              const rank = index + 1;
              const isFirst = rank === 1;

              return (
                <div key={index} className="relative flex items-center gap-md group cursor-default">
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full p-1 border ${
                      isFirst ? "border-tertiary w-14 h-14" : "border-outline-variant"
                    }`}>
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-surface-container flex items-center justify-center">
                          <span className="material-symbols-outlined text-outline">person</span>
                        </div>
                      )}
                    </div>
                    <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                      isFirst ? "bg-tertiary text-on-tertiary w-6 h-6 -top-2" : "bg-outline-variant text-on-surface"
                    }`}>
                      {rank}º
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-label-md text-label-md text-on-surface font-semibold flex items-center flex-wrap">
                      <span>{member.name}</span>
                      {renderUserLevelBadge(member.uid, member.name)}
                    </p>
                    <div className="w-full bg-surface-variant h-1 rounded-full mt-xs overflow-hidden">
                      <div 
                        className={`h-full ${isFirst ? "bg-gradient-to-r from-tertiary to-tertiary-fixed-dim xp-glow" : "bg-outline"}`}
                        style={{ width: `${85 - rank * 15}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`font-label-md ${isFirst ? "text-tertiary" : "text-on-surface"}`}>{member.xp.toLocaleString()}</p>
                    <p className="text-[10px] text-on-surface-variant">XP</p>
                  </div>
                </div>
              );
            })}
          </div>

          <button className="w-full py-sm border border-outline-variant/30 rounded-lg text-label-sm font-label-sm hover:bg-surface-variant transition-colors">
            Ver Ranking Completo
          </button>
        </section>

        {/* Trending */}
        <section className="glass-card rounded-xl p-md space-y-md">
          <h3 className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant">Trending</h3>
          <div className="flex flex-wrap gap-xs">
            <span className="bg-surface-variant px-sm py-1 rounded-full text-xs hover:text-tertiary transition-colors cursor-pointer">
              #EstiloClubber
            </span>
            <span className="bg-surface-variant px-sm py-1 rounded-full text-xs hover:text-tertiary transition-colors cursor-pointer">
              #SharpEdgeIPA
            </span>
            <span className="bg-surface-variant px-sm py-1 rounded-full text-xs hover:text-tertiary transition-colors cursor-pointer">
              #GoldenHour
            </span>
          </div>
        </section>
      </div>

    </div>
  );
}
