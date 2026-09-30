import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, ComposedChart, Line, LineChart, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, Package, DollarSign, RefreshCw, BarChart3, Clock,
  Sun, Moon, AlertTriangle
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { demoApi } from '../../demo/demoApi';

// ─── Paleta de cores ─────────────────────────────────────────────────────────

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9', '#f97316'];

const THEME = {
  light: {
    bg: '#f8fafc',
    card: '#ffffff',
    border: '#e2e8f0',
    text: '#0f172a',
    textMuted: '#64748b',
    grid: '#e2e8f0',
    axis: '#64748b',
    tooltip: { bg: '#ffffff', border: '#cbd5e1', color: '#0f172a' },
    kpiBg: '#f1f5f9',
    kpiIcon: '#6366f1',
    headerBorder: '#e2e8f0',
    infoBg: '#eff6ff',
    infoBorder: '#bfdbfe',
    infoText: '#1e40af',
    warnBg: '#fffbeb',
    warnBorder: '#fcd34d',
    warnText: '#92400e',
    noteBg: '#f1f5f9',
    noteBorder: '#e2e8f0',
    noteText: '#475569',
    emptyText: '#94a3b8',
  },
  dark: {
    bg: '#0f172a',
    card: '#1e293b',
    border: '#334155',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    grid: '#334155',
    axis: '#94a3b8',
    tooltip: { bg: '#1e293b', border: '#475569', color: '#f8fafc' },
    kpiBg: '#1e293b',
    kpiIcon: '#818cf8',
    headerBorder: '#334155',
    infoBg: '#1e3a5f',
    infoBorder: '#3b82f6',
    infoText: '#93c5fd',
    warnBg: '#451a03',
    warnBorder: '#f59e0b',
    warnText: '#fde68a',
    noteBg: '#1e293b',
    noteBorder: '#334155',
    noteText: '#94a3b8',
    emptyText: '#475569',
  },
};

// ─── Utilitários ─────────────────────────────────────────────────────────────

const fmt = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtN = (v, dec = 2) => Number(v || 0).toFixed(dec);

const groupByCategory = (products) => {
  const map = {};
  for (const p of products) {
    const cat = String(p.category || 'Sem categoria').trim() || 'Sem categoria';
    if (!map[cat]) map[cat] = [];
    map[cat].push(p);
  }
  return map;
};

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function KpiCard({ title, value, unit, change, changeType, icon: Icon, description, t }) {
  const changeColor =
    changeType === 'positive' ? '#10b981' :
      changeType === 'negative' ? '#ef4444' : '#f59e0b';
  const arrow =
    changeType === 'positive' ? '↑' :
      changeType === 'negative' ? '↓' : '•';

  return (
    <div style={{
      background: t.card,
      border: `1px solid ${t.border}`,
      borderRadius: 12,
      padding: '1rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: t.textMuted }}>
          {title}
        </span>
        {Icon && (
          <div style={{ background: t.kpiBg, borderRadius: 8, padding: '6px', color: t.kpiIcon }}>
            <Icon size={18} />
          </div>
        )}
      </div>
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: t.text }}>{value}</span>
        {unit && <span style={{ fontSize: 13, color: t.textMuted }}>{unit}</span>}
      </div>
      {change !== undefined && (
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', fontSize: 12 }}>
          <span style={{ fontWeight: 600, color: changeColor }}>{arrow} {change}</span>
          <span style={{ marginLeft: 4, color: t.textMuted }}>{description}</span>
        </div>
      )}
    </div>
  );
}

function Card({ title, subtitle, icon: Icon, children, t }) {
  return (
    <div style={{
      background: t.card,
      border: `1px solid ${t.border}`,
      borderRadius: 12,
      padding: '1.25rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
      transition: 'box-shadow 0.2s',
    }}>
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, color: t.text }}>
          {Icon && <Icon size={18} color="#6366f1" />}
          {title}
        </h3>
        {subtitle && <p style={{ fontSize: 12, color: t.textMuted, marginTop: 3 }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ message, t }) {
  return (
    <p style={{ fontSize: 13, textAlign: 'center', padding: '2rem 0', color: t.emptyText }}>
      {message}
    </p>
  );
}

// ─── Componente Principal ────────────────────────────────────────────────────

export default function IndicadoresPanel({ userId, demo }) {
  const [dark, setDark] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);

  const t = dark ? THEME.dark : THEME.light;

  // ── Carga de dados ──────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (demo || userId === 'demo') {
        setProducts(demoApi.listProducts());
        setSales(demoApi.listSales());
        return;
      }
      if (!userId) return;

      const [{ data: prods, error: pErr }, { data: sls, error: sErr }] = await Promise.all([
        supabase
          .from('products')
          .select('id,name,barcode,category,quantity,cost_price,sale_price,created_at')
          .eq('user_id', userId)
          .limit(5000),
        supabase
          .from('sales')
          .select('id,product_id,product_name,barcode,quantity,total_price,total,cost_total,profit,sale_date,created_at')
          .eq('user_id', userId)
          .limit(5000),
      ]);
      if (pErr) throw pErr;
      if (sErr) throw sErr;
      setProducts(Array.isArray(prods) ? prods : []);
      setSales(Array.isArray(sls) ? sls : []);
    } catch (e) {
      setError(e?.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [userId, demo]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Cálculos ────────────────────────────────────────────────────────────

  /** 1. Giro de Estoque mensal */
  const giroData = useMemo(() => {
    const byMonth = {};
    for (const s of sales) {
      const dateStr = s.sale_date || s.created_at;
      if (!dateStr) continue;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
      const qty = Number(s.quantity || 1);
      const cost = s.cost_total != null
        ? Number(s.cost_total || 0)
        : (products.find(p => String(p.id) === String(s.product_id))?.cost_price || 0) * qty;
      if (!byMonth[key]) byMonth[key] = { mes: label, cpv: 0 };
      byMonth[key].cpv += cost;
    }
    const stockValue = products.reduce(
      (acc, p) => acc + Number(p.cost_price || 0) * Number(p.quantity || 0), 0
    );
    const estoqueMedio = stockValue > 0 ? stockValue : 1;
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([, v]) => ({
        mes: v.mes,
        giro: Number((v.cpv / estoqueMedio).toFixed(2)),
        meta: 2.0,
      }));
  }, [sales, products]);

  /** 2. Curva ABC */
  const curvaAbcData = useMemo(() => {
    const map = {};
    for (const s of sales) {
      const id = s.product_id || s.barcode || s.product_name || 'desconhecido';
      const nome = s.product_name
        || products.find(p => String(p.id) === String(s.product_id))?.name
        || 'Produto';
      const rev = Number(s.total_price ?? s.total ?? 0);
      if (!map[id]) map[id] = { produto: nome.slice(0, 18), faturamento: 0 };
      map[id].faturamento += rev;
    }
    const sorted = Object.values(map).sort((a, b) => b.faturamento - a.faturamento);
    const total = sorted.reduce((acc, v) => acc + v.faturamento, 0) || 1;
    let acum = 0;
    return sorted.slice(0, 10).map((item) => {
      acum += item.faturamento;
      const pct = Number(((acum / total) * 100).toFixed(1));
      const classe = pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C';
      return { ...item, percentualAcumulado: pct, classe };
    });
  }, [sales, products]);

  /** 3. Margem por Categoria */
  const margemData = useMemo(() => {
    const map = {};
    for (const s of sales) {
      const prod = products.find(p => String(p.id) === String(s.product_id));
      const cat = String(prod?.category || 'Sem categoria').trim() || 'Sem categoria';
      const rev = Number(s.total_price ?? s.total ?? 0);
      const qty = Number(s.quantity || 1);
      const cost = s.cost_total != null
        ? Number(s.cost_total || 0)
        : Number(prod?.cost_price || 0) * qty;
      if (!map[cat]) map[cat] = { categoria: cat, receita: 0, custo: 0, lucro: 0 };
      map[cat].receita += rev;
      map[cat].custo += cost;
      map[cat].lucro += rev - cost;
    }
    return Object.values(map).filter(c => c.receita > 0);
  }, [sales, products]);

  /** 4. Distribuição do Estoque por Categoria */
  const estoqueCategoria = useMemo(() => {
    const map = groupByCategory(products);
    return Object.entries(map)
      .map(([cat, prods], i) => ({
        name: cat,
        value: prods.reduce((a, p) => a + Number(p.cost_price || 0) * Number(p.quantity || 0), 0),
        color: PALETTE[i % PALETTE.length],
      }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [products]);

  /** 5. Potencial de Vendas (Top 5 Últimos 3 Meses) */
  const potencialVendasData = useMemo(() => {
    const hoje = new Date();
    const tresMesesAtras = new Date();
    tresMesesAtras.setMonth(hoje.getMonth() - 3);

    const map = {};
    for (const s of sales) {
      const dateStr = s.sale_date || s.created_at;
      if (!dateStr) continue;
      const d = new Date(dateStr);
      if (isNaN(d.getTime()) || d < tresMesesAtras) continue;

      const id = s.product_id || s.barcode || s.product_name || 'desconhecido';
      const nome = s.product_name
        || products.find(p => String(p.id) === String(s.product_id))?.name
        || 'Produto';

      const rev = Number(s.total_price ?? s.total ?? 0);
      const qty = Number(s.quantity || 1);

      if (!map[id]) map[id] = { nome: nome.slice(0, 22), receita: 0, quantidade: 0 };
      map[id].receita += rev;
      map[id].quantidade += qty;
    }

    return Object.values(map)
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 5);
  }, [sales, products]);

  /** KPIs */
  const totalEstoqueValor = useMemo(
    () => products.reduce((a, p) => a + Number(p.cost_price || 0) * Number(p.quantity || 0), 0),
    [products]
  );
  const totalFaturamento = useMemo(
    () => sales.reduce((a, s) => a + Number(s.total_price ?? s.total ?? 0), 0),
    [sales]
  );
  const totalLucro = useMemo(() =>
    sales.reduce((a, s) => {
      const rev = Number(s.total_price ?? s.total ?? 0);
      const qty = Number(s.quantity || 1);
      const cost = s.cost_total != null
        ? Number(s.cost_total || 0)
        : (products.find(p => String(p.id) === String(s.product_id))?.cost_price || 0) * qty;
      return a + (rev - cost);
    }, 0), [sales, products]);

  const margemGeral = totalFaturamento > 0
    ? Number(((totalLucro / totalFaturamento) * 100).toFixed(1)) : 0;

  const mediaGiro = useMemo(() => {
    if (!giroData.length) return 0;
    return (giroData.reduce((a, c) => a + c.giro, 0) / giroData.length).toFixed(1);
  }, [giroData]);

  const produtosComEstoque = products.filter(p => Number(p.quantity || 0) > 0).length;

  const tipTooltip = (dark) => ({
    contentStyle: {
      backgroundColor: dark ? THEME.dark.tooltip.bg : THEME.light.tooltip.bg,
      borderColor: dark ? THEME.dark.tooltip.border : THEME.light.tooltip.border,
      borderRadius: 8,
      color: dark ? THEME.dark.tooltip.color : THEME.light.tooltip.color,
    },
  });

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#6366f1', fontWeight: 600 }}>
        <RefreshCw size={32} style={{ display: 'inline-block', marginBottom: 12, animation: 'spin 1s linear infinite' }} />
        <br />Carregando indicadores...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#ef4444', fontWeight: 600 }}>
        ⚠️ {error}
        <br />
        <button
          onClick={loadData}
          style={{ marginTop: 12, padding: '8px 16px', borderRadius: 8, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const hasSales = sales.length > 0;
  const hasProducts = products.length > 0;

  const criticos = [...products]
    .filter(p => Number(p.quantity || 0) < 10)
    .sort((a, b) => Number(a.quantity || 0) - Number(b.quantity || 0))
    .slice(0, 8);

  return (
    <div style={{ minHeight: '100vh', background: t.bg, padding: '1.5rem', fontFamily: "'Segoe UI', Inter, system-ui, sans-serif", color: t.text, transition: 'background 0.2s, color 0.2s' }}>

      {/* Header */}
      <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: `1px solid ${t.headerBorder}` }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, margin: 0, color: t.text }}>
            <BarChart3 size={28} color="#6366f1" />
            Indicadores Estatísticos
          </h1>
          <p style={{ fontSize: 13, color: t.textMuted, marginTop: 4 }}>
            Análise de estoque, vendas e margem com base nos dados reais do sistema
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={loadData}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, fontWeight: 500, borderRadius: 8, border: `1px solid ${t.border}`, background: t.card, color: t.text, cursor: 'pointer' }}
          >
            <RefreshCw size={15} color="#6366f1" />
            Atualizar
          </button>
          <button
            onClick={() => setDark(d => !d)}
            title="Alternar tema"
            style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${t.border}`, background: t.card, color: dark ? '#fbbf24' : t.textMuted, cursor: 'pointer' }}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Avisos */}
      {!hasProducts && (
        <div style={{ marginBottom: '1rem', padding: '12px 16px', borderRadius: 10, border: `1px solid ${t.warnBorder}`, background: t.warnBg, color: t.warnText, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
          <AlertTriangle size={18} />
          Nenhum produto cadastrado. Cadastre produtos para visualizar os indicadores.
        </div>
      )}
      {hasProducts && !hasSales && (
        <div style={{ marginBottom: '1rem', padding: '12px 16px', borderRadius: 10, border: `1px solid ${t.infoBorder}`, background: t.infoBg, color: t.infoText, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
          <AlertTriangle size={18} />
          Nenhuma venda registrada. Os gráficos de faturamento e giro ficarão disponíveis após o primeiro registro de venda.
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard
          title="Valor em Estoque (Custo)"
          value={fmt(totalEstoqueValor)}
          icon={DollarSign}
          change={`${produtosComEstoque} produtos`}
          changeType="positive"
          description="com estoque disponível"
          t={t}
        />
        <KpiCard
          title="Faturamento Total"
          value={fmt(totalFaturamento)}
          icon={TrendingUp}
          change={hasSales ? `${sales.length} vendas` : 'Sem vendas'}
          changeType={hasSales ? 'positive' : 'neutral'}
          description="registradas"
          t={t}
        />
        <KpiCard
          title="Lucro Bruto Total"
          value={fmt(totalLucro)}
          icon={DollarSign}
          change={`${margemGeral}%`}
          changeType={margemGeral > 20 ? 'positive' : margemGeral > 0 ? 'neutral' : 'negative'}
          description="de margem bruta"
          t={t}
        />
        <KpiCard
          title="Giro de Estoque Médio"
          value={hasSales ? `${mediaGiro}×` : '—'}
          icon={RefreshCw}
          change={hasSales ? (Number(mediaGiro) >= 2 ? 'Saudável' : 'Abaixo da meta') : 'Sem dados'}
          changeType={hasSales ? (Number(mediaGiro) >= 2 ? 'positive' : 'negative') : 'neutral'}
          description="meta ≥ 2.0×"
          t={t}
        />
      </div>

      {/* Grid de gráficos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem' }}>

        {/* 1. Giro de Estoque */}
        {hasSales && (
          <Card title="1. Giro de Estoque (Turnover)" subtitle="Renovação do estoque por mês — meta ≥ 2.0×" icon={RefreshCw} t={t}>
            {giroData.length === 0 ? (
              <EmptyState message="Sem dados de vendas suficientes para calcular." t={t} />
            ) : (
              <div style={{ height: 288 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={giroData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
                    <XAxis dataKey="mes" stroke={t.axis} tick={{ fontSize: 12 }} />
                    <YAxis stroke={t.axis} tick={{ fontSize: 12 }} />
                    <Tooltip {...tipTooltip(dark)} formatter={(v, n) => [fmtN(v), n]} />
                    <Legend />
                    <Line type="monotone" dataKey="giro" name="Giro Realizado" stroke="#6366f1" strokeWidth={3} dot={{ r: 5 }} />
                    <Line type="monotone" dataKey="meta" name="Meta (2.0×)" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        )}

        {/* 2. Curva ABC */}
        {hasSales && (
          <Card title="2. Curva ABC — Princípio 80/20" subtitle="Produtos Classe A representam 80% do faturamento acumulado" icon={BarChart3} t={t}>
            {curvaAbcData.length === 0 ? (
              <EmptyState message="Sem vendas registradas por produto." t={t} />
            ) : (
              <div style={{ height: 288 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={curvaAbcData} margin={{ top: 10, right: 30, left: 0, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
                    <XAxis dataKey="produto" stroke={t.axis} tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis yAxisId="left" stroke={t.axis} tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" unit="%" domain={[0, 100]} stroke={t.axis} tick={{ fontSize: 11 }} />
                    <Tooltip {...tipTooltip(dark)} formatter={(v, n) => n === 'Faturamento' ? fmt(v) : `${v}%`} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="faturamento" name="Faturamento" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="percentualAcumulado" name="% Acumulado" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        )}

        {/* 3. Margem por Categoria */}
        {hasSales && (
          <Card title="3. Margem e Lucro por Categoria" subtitle="Receita vs Custo de Mercadoria por grupo de produtos" icon={TrendingUp} t={t}>
            {margemData.length === 0 ? (
              <EmptyState message="Sem dados de vendas por categoria." t={t} />
            ) : (
              <div style={{ height: 288 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={margemData} margin={{ top: 10, right: 30, left: 0, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
                    <XAxis dataKey="categoria" stroke={t.axis} tick={{ fontSize: 11 }} angle={-20} textAnchor="end" interval={0} />
                    <YAxis stroke={t.axis} tick={{ fontSize: 11 }} />
                    <Tooltip {...tipTooltip(dark)} formatter={(v) => fmt(v)} />
                    <Legend />
                    <Bar dataKey="lucro" name="Lucro Bruto" stackId="a" fill="#10b981" />
                    <Bar dataKey="custo" name="Custo Mercadoria" stackId="a" fill="#64748b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        )}

        {/* 4. Distribuição do Estoque por Categoria */}
        {hasProducts && (
          <Card title="4. Distribuição do Estoque por Categoria" subtitle="Percentual do valor investido (custo × quantidade) por categoria" icon={Package} t={t}>
            {estoqueCategoria.length === 0 ? (
              <EmptyState message="Nenhum produto com estoque e custo cadastrados." t={t} />
            ) : (
              <div style={{ height: 288 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={estoqueCategoria}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {estoqueCategoria.map((entry, i) => (
                        <Cell key={`cell-${i}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip {...tipTooltip(dark)} formatter={(v) => fmt(v)} />
                    <Legend layout="vertical" align="right" verticalAlign="middle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        )}

        {/* 5. Top 8 Produtos com Mais Estoque */}
        {hasProducts && (
          <Card title="5. Produtos com Maior Estoque" subtitle="Os 8 produtos com maior quantidade disponível em estoque" icon={Package} t={t}>
            <div style={{ height: 288 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={[...products]
                    .sort((a, b) => Number(b.quantity || 0) - Number(a.quantity || 0))
                    .slice(0, 8)
                    .map(p => ({ nome: p.name.slice(0, 22), quantidade: Number(p.quantity || 0) }))}
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
                  <XAxis type="number" unit=" un" stroke={t.axis} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="nome" width={130} stroke={t.axis} tick={{ fontSize: 11 }} />
                  <Tooltip {...tipTooltip(dark)} formatter={(v) => [`${v} un`, 'Quantidade']} />
                  <Bar dataKey="quantidade" name="Quantidade" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* 6. Produtos com Estoque Crítico */}
        {hasProducts && (
          <Card title="6. Produtos com Estoque Crítico" subtitle="Produtos com quantidade < 10 unidades (abaixo do limite sugerido)" icon={Clock} t={t}>
            {criticos.length === 0 ? (
              <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: '#10b981', fontSize: 14, fontWeight: 500, textAlign: 'center' }}>
                  ✅ Todos os produtos estão com estoque saudável (≥ 10 unidades).
                </p>
              </div>
            ) : (
              <div style={{ height: 288 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={criticos.map(p => ({
                      nome: p.name.slice(0, 22),
                      quantidade: Number(p.quantity || 0),
                    }))}
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
                    <XAxis type="number" unit=" un" stroke={t.axis} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="nome" width={130} stroke={t.axis} tick={{ fontSize: 11 }} />
                    <Tooltip {...tipTooltip(dark)} formatter={(v) => [`${v} un`, 'Estoque']} />
                    <Bar dataKey="quantidade" name="Estoque Atual" radius={[0, 4, 4, 0]}>
                      {criticos.map((p, i) => (
                        <Cell
                          key={i}
                          fill={
                            Number(p.quantity || 0) <= 0
                              ? '#ef4444'
                              : Number(p.quantity || 0) < 5
                                ? '#f97316'
                                : '#f59e0b'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        )}

        {/* 7. Potencial de Vendas (Últimos 3 Meses) */}
        {hasSales && (
          <Card title="7. Potencial de Vendas" subtitle="Top 5 produtos com maior faturamento nos últimos 3 meses" icon={TrendingUp} t={t}>
            {potencialVendasData.length === 0 ? (
              <EmptyState message="Sem vendas registradas nos últimos 3 meses." t={t} />
            ) : (
              <div style={{ height: 288 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={potencialVendasData}
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
                    <XAxis type="number" stroke={t.axis} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="nome" width={130} stroke={t.axis} tick={{ fontSize: 11 }} />
                    <Tooltip {...tipTooltip(dark)} formatter={(v) => fmt(v)} />
                    <Bar dataKey="receita" name="Faturamento (R$)" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        )}
      </div>



      <footer style={{ marginTop: '2rem', textAlign: 'center', fontSize: 12, color: t.textMuted, paddingTop: '1rem', borderTop: `1px solid ${t.border}` }}>
        Indicadores Estatísticos de Estoque • Projeto Integrador Univesp
      </footer>
    </div>
  );
}
