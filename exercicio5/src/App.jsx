import React, { useEffect, useMemo, useRef, useState } from "react";

// ✅ App React em um único arquivo
// - Busca filmes na API do TMDB
// - Paginação
// - Página de detalhes com diretor, elenco, sinopse e avaliação
// - Lista de favoritos com persistência em localStorage
// - Estados de loading e erro
// - Campo para salvar a API KEY do TMDB (persistida em localStorage)
// Estilizado com classes utilitárias (compatível com Tailwind, se presente)

const TMDB_IMG = {
  w92: (p) => (p ? `https://image.tmdb.org/t/p/w92${p}` : ""),
  w154: (p) => (p ? `https://image.tmdb.org/t/p/w154${p}` : ""),
  w200: (p) => (p ? `https://image.tmdb.org/t/p/w200${p}` : ""),
  w500: (p) => (p ? `https://image.tmdb.org/t/p/w500${p}` : ""),
};

function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
}

function Spinner({ label = "Carregando..." }) {
  return (
    <div className="flex items-center gap-3 text-sm text-gray-600 animate-pulse">
      <div className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
      <span>{label}</span>
    </div>
  );
}

function ErrorMsg({ message }) {
  if (!message) return null;
  return (
    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
      {message}
    </div>
  );
}

function MovieCard({ movie, onOpen, isFavorite, onToggleFavorite }) {
  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : "—";
  return (
    <div className="flex gap-4 p-3 rounded-2xl bg-white/70 shadow-sm border border-gray-100 hover:shadow-md transition">
      <img
        src={TMDB_IMG.w154(movie.poster_path) || ""}
        alt={movie.title}
        className="w-[100px] h-[150px] object-cover rounded-xl bg-gray-200"
        loading="lazy"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-gray-900 text-lg truncate">{movie.title}</h3>
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 shrink-0">{year}</span>
        </div>
        <p className="text-sm text-gray-600 line-clamp-3 mt-1">
          {movie.overview || "Sem sinopse disponível."}
        </p>
        <div className="flex items-center gap-2 mt-3">
          <button
          className="px-3 py-2 text-sm rounded-xl bg-pink-500 text-white hover:bg-pink-600"
          onClick={() => onOpen(movie)}
>
            Ver detalhes
          </button>
          <button
  className={`px-3 py-2 text-sm rounded-xl border ${
    isFavorite ? "bg-pink-100 border-pink-300 text-white" : "bg-white text-white"
  }`}
            onClick={() => onToggleFavorite(movie)}
            title={isFavorite ? "❤" : "♡"}
          >
            {isFavorite ? "❤" : "♡"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null;
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const around = 1; // quantidade de páginas vizinhas
  const start = Math.max(1, page - around);
  const end = Math.min(totalPages, page + around);
  const pages = [];
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <div className="flex items-center gap-2 justify-center mt-6">
      <button
        className="px-3 py-2 rounded-xl border disabled:opacity-40"
        disabled={!canPrev}
        onClick={() => onChange(page - 1)}
      >
        Anterior
      </button>
      {start > 1 && (
        <>
          <button className="px-3 py-2 rounded-xl border" onClick={() => onChange(1)}>1</button>
          {start > 2 && <span className="px-1 text-gray-500">…</span>}
        </>
      )}
      {pages.map((p) => (
        <button
          key={p}
          className={`px-3 py-2 rounded-xl border ${p === page ? "bg-black text-white" : ""}`}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-gray-500">…</span>}
          <button className="px-3 py-2 rounded-xl border" onClick={() => onChange(totalPages)}>
            {totalPages}
          </button>
        </>
      )}
      <button
        className="px-3 py-2 rounded-xl border disabled:opacity-40"
        disabled={!canNext}
        onClick={() => onChange(page + 1)}
      >
        Próxima
      </button>
    </div>
  );
}

function DetailsModal({ movie, onClose, onToggleFavorite, isFavorite, apiKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!movie) return;
    let abort = false;
    const load = async () => {
      setLoading(true); setError("");
      try {
        const url = `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${apiKey}&language=pt-BR&append_to_response=credits`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Erro ${res.status}`);
        const json = await res.json();
        if (!abort) setData(json);
      } catch (e) {
        if (!abort) setError("Não foi possível carregar os detalhes.");
      } finally {
        if (!abort) setLoading(false);
      }
    };
    load();
    return () => { abort = true; };
  }, [movie, apiKey]);

  if (!movie) return null;

  const director = data?.credits?.crew?.find((m) => m.job === "Director")?.name || "—";
  const cast = (data?.credits?.cast || []).slice(0, 8).map((c) => c.name).join(", ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-4 p-4 border-b">
          <img
            src={TMDB_IMG.w200(movie.poster_path)}
            alt={movie.title}
            className="w-[140px] h-[210px] object-cover rounded-xl bg-gray-200"
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-gray-900">{movie.title}</h2>
            <p className="text-sm text-gray-600 mt-1">{movie.release_date?.slice(0, 4) || "—"}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2 py-1 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-700">
                ⭐ {movie.vote_average?.toFixed?.(1) ?? movie.vote_average ?? "—"}
              </span>
              <button
                className={`px-3 py-2 text-sm rounded-xl border ${
                  isFavorite ? "bg-yellow-100 border-yellow-300" : "bg-white"
                }`}
                onClick={() => onToggleFavorite(movie)}
              >
                {isFavorite ? "❤" : "♡"}
              </button>
              <button className="ml-auto px-3 py-2 text-sm rounded-xl bg-gray-900 text-white" onClick={onClose}>
                Fechar
              </button>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {loading && <Spinner label="Carregando detalhes..." />}
          <ErrorMsg message={error} />
          {!loading && !error && (
            <>
              <div>
                <h3 className="font-semibold text-gray-900">Sinopse</h3>
                <p className="text-gray-700 text-sm mt-1">{movie.overview || "Sem sinopse."}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900">Diretor</h4>
                  <p className="text-sm text-gray-700">{director}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Elenco</h4>
                  <p className="text-sm text-gray-700">{cast || "—"}</p>
                </div>
              </div>
              {data?.homepage && (
                <a
                  href={data.homepage}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-2 text-sm underline text-blue-700"
                >
                  Site oficial
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AppTMDB() {
  const [apiKey, setApiKey] = useLocalStorage("tmdb_api_key", "");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [favorites, setFavorites] = useLocalStorage("favorites_v1", []);

  const controllerRef = useRef(null);

  const favoriteIds = useMemo(() => new Set(favorites.map((m) => m.id)), [favorites]);

  function toggleFavorite(movie) {
    setFavorites((prev) => {
      const exists = prev.some((m) => m.id === movie.id);
      if (exists) return prev.filter((m) => m.id !== movie.id);
      // armazenar apenas o essencial
      const compact = {
        id: movie.id,
        title: movie.title,
        poster_path: movie.poster_path,
        release_date: movie.release_date,
        vote_average: movie.vote_average,
      };
      return [compact, ...prev];
    });
  }

  async function search(q, p = 1) {
    if (!apiKey) {
      setError("Informe sua API Key do TMDB para buscar filmes.");
      return;
    }
    if (!q?.trim()) {
      setResults([]); setTotalPages(0); setError("");
      return;
    }
    try {
      if (controllerRef.current) controllerRef.current.abort();
      controllerRef.current = new AbortController();
      setLoading(true); setError("");
      const url = new URL("https://api.themoviedb.org/3/search/movie");
      url.searchParams.set("api_key", apiKey);
      url.searchParams.set("query", q);
      url.searchParams.set("page", String(p));
      url.searchParams.set("language", "pt-BR");

      const res = await fetch(url, { signal: controllerRef.current.signal });
      if (!res.ok) {
        if (res.status === 401) throw new Error("API Key inválida.");
        throw new Error(`Erro ${res.status}`);
      }
      const json = await res.json();
      setResults(json.results || []);
      setTotalPages(Math.min(json.total_pages || 0, 500)); // limite do TMDB
    } catch (e) {
      if (e.name !== "AbortError") {
        setError(e.message || "Falha ao buscar filmes.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Busca quando page muda
  useEffect(() => {
    if (term.trim()) search(term, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // debounce da busca ao digitar
  useEffect(() => {
    const id = setTimeout(() => {
      setPage(1);
      if (term.trim()) search(term, 1);
      else { setResults([]); setTotalPages(0); setError(""); }
    }, 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, apiKey]);

  return (
  <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-100 text-purple-900">
    <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/60 border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold">🎬 My Filmes List</h1>
          <div className="flex items-center gap-2 ml-auto">
            <input
              type="password"
              placeholder="API Key do TMDB"
              className="px-3 py-2 rounded-xl border bg-white/80 text-sm w-56"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <section className="bg-white/70 border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <input
              type="text"
              placeholder="Título"
              className="flex-1 px-4 py-3 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-black/10"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
            {loading ? <Spinner /> : <div className="text-sm text-gray-500">{results.length} resultados</div>}
          </div>
          <div className="mt-3">
            <ErrorMsg message={error} />
          </div>
        </section>

        {/* Lista de resultados */}
        <section className="mt-6 grid grid-cols-1 gap-3">
          {results.map((m) => (
            <MovieCard
              key={m.id}
              movie={m}
              onOpen={setSelected}
              onToggleFavorite={toggleFavorite}
              isFavorite={favoriteIds.has(m.id)}
            />
          ))}
          {!loading && term && results.length === 0 && !error && (
            <div className="text-center text-gray-600 py-10">Nenhum resultado encontrado.</div>
          )}
        </section>

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />

        {/* Favoritos */}
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">❤ Favoritos ({favorites.length})</h2>
            {favorites.length > 0 && (
              <button
                className="text-sm underline text-gray-600"
                onClick={() => setFavorites([])}
              >
                Limpar favoritos
              </button>
            )}
          </div>
          {favorites.length === 0 ? (
            <p className="text-sm text-gray-600 mt-2">Você ainda não adicionou filmes aos favoritos.</p>
          ) : (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {favorites.map((m) => (
                <div key={m.id} className="group relative">
                  <img
                    src={TMDB_IMG.w200(m.poster_path)}
                    alt={m.title}
                    className="w-full aspect-[2/3] object-cover rounded-xl border bg-gray-200"
                  />
                  <div className="mt-2 text-sm font-medium line-clamp-2" title={m.title}>{m.title}</div>
                  <div className="text-xs text-gray-500">{m.release_date?.slice(0, 4) || "—"}</div>
                  <button
                    className="absolute top-2 right-2 px-2 py-1 text-xs rounded-lg bg-white/90 border hover:bg-white"
                    onClick={() => toggleFavorite(m)}
                    title="Remover"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Modal de Detalhes */}
      {selected && (
        <DetailsModal
          movie={selected}
          onClose={() => setSelected(null)}
          onToggleFavorite={toggleFavorite}
          isFavorite={favoriteIds.has(selected.id)}
          apiKey={apiKey}
        />
      )}

      <footer className="max-w-6xl mx-auto px-4 py-10 text-xs text-gray-500">
        <p>
          Feito para estudo. Dados de filmes por <a className="underline" href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">TMDB</a>.
        </p>
      </footer>
    </div>
  );
}
