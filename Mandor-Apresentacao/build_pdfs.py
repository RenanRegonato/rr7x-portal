# -*- coding: utf-8 -*-
"""Gera HTML fiel do deck Assis (7 slides) e do Mapa da Reunião, para imprimir
em PDF via Chrome headless. Fonte Newsreader + Hanken Grotesk via Google Fonts."""
import markdown, pathlib

HERE = pathlib.Path("/Users/renan/Desktop/rr7x-portal/Mandor-Apresentacao")

FONTS = """
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500&family=Hanken+Grotesk:wght@500;700&display=swap" rel="stylesheet">
"""

DECK_CSS = """
*{margin:0;padding:0;box-sizing:border-box}
html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
@page{size:1280px 720px;margin:0}
.slide{width:1280px;height:720px;position:relative;overflow:hidden;
  padding:70px 90px;page-break-after:always;font-family:'Newsreader',serif}
.slide:last-child{page-break-after:auto}
.dark{background:linear-gradient(135deg,#221B13 0%,#18140F 100%);color:#EDE9E5}
.light{background:linear-gradient(135deg,#EDE9E5 0%,#E2DBD1 100%);color:#211F1A}
.label{font-family:'Hanken Grotesk',sans-serif;font-weight:700;font-size:13px;
  letter-spacing:.22em;text-transform:uppercase;display:flex;align-items:center;gap:14px}
.label::before{content:"";width:30px;height:2px;background:currentColor;display:inline-block}
.bz{color:#8C6F45}.bzl{color:#C0A26C}.dim{color:#B7B0A6}.gray{color:#5E5A53}
h1{font-weight:400;line-height:1.05;letter-spacing:-.01em}
.it{font-style:italic}
.mono-wm{display:flex;align-items:center;gap:18px}
.mono-wm svg{height:60px}
.wm{font-size:34px;letter-spacing:.34em;font-weight:500}
.foot{position:absolute;left:90px;right:90px;bottom:34px;display:flex;
  justify-content:space-between;align-items:center;font-family:'Hanken Grotesk',sans-serif;
  font-size:11px;letter-spacing:.22em;font-weight:700}
.foot .l{display:flex;align-items:center;gap:10px}.foot svg{height:18px}
.foot .pg{font-weight:500;letter-spacing:.18em}
.tick{display:flex;gap:16px;align-items:flex-start;margin:14px 0}
.tick::before{content:"";width:22px;height:3px;background:#8C6F45;margin-top:16px;flex:none}
.num{color:#C0A26C;font-size:20px;margin-right:18px}
.col-head{font-family:'Hanken Grotesk',sans-serif;font-weight:700;font-size:12px;
  letter-spacing:.2em;text-transform:uppercase;margin-bottom:22px}
"""

def mono(color):
    return (f'<svg viewBox="0 0 48 50" fill="{color}" xmlns="http://www.w3.org/2000/svg">'
            '<rect x="0" y="0" width="10" height="50"/>'
            '<polygon points="25.4,0 35.4,0 22,50 12,50"/>'
            '<rect x="37.4" y="0" width="10" height="50"/></svg>')

def foot(dark, pg):
    col = "#B7B0A6" if dark else "#5E5A53"
    m = mono("#EDE9E5" if dark else "#211F1A")
    return (f'<div class="foot" style="color:{col}"><div class="l">{m}'
            f'<span>MANDOR &nbsp;·&nbsp; ASSIS GESTÃO</span></div>'
            f'<div class="pg">{pg:02d} / 07</div></div>')

S = []
# 1 capa
S.append(f"""<div class="slide dark">
<div class="mono-wm" style="margin-top:36px">{mono('#EDE9E5')}<span class="wm">MANDOR</span></div>
<div class="label bzl" style="margin-top:70px">CONVERSA INSTITUCIONAL &nbsp;·&nbsp; ASSIS GESTÃO</div>
<h1 style="font-size:50px;margin-top:34px;max-width:1000px">Infraestrutura analítica institucional para <span class="it bzl">capital privado</span></h1>
<p class="dim" style="font-size:19px;margin-top:34px;max-width:880px;line-height:1.4">Onde o Mandor amplifica a operação da Assis, e onde não. Uma conversa antes de qualquer demonstração.</p>
{foot(True,1)}</div>""")

# 2 fit 5 de 12
cinco = ["M&amp;A (Fusões e Aquisições)","Due Diligence","Valuation","Estruturação de Capital","Diagnóstico Empresarial (parte analítica)"]
sete = "Governança &nbsp;·&nbsp; Compliance contínuo &nbsp;·&nbsp; Auditoria contábil &nbsp;·&nbsp; Administração Judicial &nbsp;·&nbsp; Treinamento de Gestão &nbsp;·&nbsp; Calendário Contábil &nbsp;·&nbsp; Balanced Scorecard"
ticks = "".join(f'<div class="tick"><span style="font-size:19px">{c}</span></div>' for c in cinco)
S.append(f"""<div class="slide light">
<div class="label bz">ONDE O MANDOR ENCAIXA NA ASSIS</div>
<h1 style="font-size:37px;margin-top:26px;max-width:1060px">Dos 12 serviços da Assis, o Mandor amplifica <span class="it bz">cinco</span>. Os outros sete seguem com vocês.</h1>
<div style="display:flex;margin-top:48px;gap:0">
  <div style="width:600px">
    <div class="col-head bz">O MANDOR AMPLIFICA &nbsp;·&nbsp; 5 DE 12</div>{ticks}
  </div>
  <div style="width:1px;background:#CFC7BB;margin:0 50px"></div>
  <div style="width:430px">
    <div class="col-head gray">SEGUE 100% COM A ASSIS &nbsp;·&nbsp; 7 DE 12</div>
    <p class="gray" style="font-size:18px;line-height:1.7">{sete}</p>
  </div>
</div>
{foot(False,2)}</div>""")

# 3 tres perguntas
perg = [("01","A inteligência da casa fica, ou vai embora com o sócio?"),
        ("02","O deal chega ao comprador certo, ou depende da agenda de alguém?"),
        ("03","A capacidade de análise acompanha o volume de oportunidades?")]
qs = "".join(f'<div style="margin:30px 0;font-size:27px"><span class="num">{n}</span>{q}</div>' for n,q in perg)
S.append(f"""<div class="slide dark">
<div class="label bzl">DENTRO DESSES CINCO, TRÊS PERGUNTAS</div>
<h1 style="font-size:38px;margin-top:26px;max-width:1040px">As três perguntas que aparecem em <span class="it bzl">toda casa que cresce</span></h1>
<div style="margin-top:50px">{qs}</div>
{foot(True,3)}</div>""")

# 4 demo divider
S.append(f"""<div class="slide dark">
<div class="label bzl">DEMONSTRAÇÃO AO VIVO</div>
<h1 style="font-size:46px;margin-top:150px;max-width:1040px">Em vez de explicar, deixa eu <span class="it bzl">mostrar</span>.</h1>
<p class="dim" style="font-size:19px;margin-top:34px;max-width:980px;line-height:1.4">Lumina Diagnósticos. Venda de controle, medicina diagnóstica no Sul. Um caso do mundo de vocês, rodado por dentro do Mandor.</p>
{foot(True,4)}</div>""")

# 5 estado resolvido
res = ["A inteligência analítica da casa fica na casa, mesmo quando um sócio sai.",
       "Cada deal sai do diagnóstico já sabendo para quem levar, com score e justificativa.",
       "O mesmo critério da mesa de vocês vale no primeiro e no quadragésimo deal do mês."]
rticks = "".join(f'<div class="tick"><span style="font-size:21px">{r}</span></div>' for r in res)
S.append(f"""<div class="slide light">
<div class="label bz">O QUE MUDA QUANDO ISSO ESTÁ RESOLVIDO</div>
<h1 style="font-size:34px;margin-top:26px">Para uma casa como a Assis, na prática:</h1>
<div style="margin-top:48px">{rticks}</div>
{foot(False,5)}</div>""")

# 6 piloto
passos = [("01","Vocês me passam um caso anonimizado que a Assis estruturou nos últimos meses."),
          ("02","Eu rodo dentro do Mandor e preparo o dossiê sobre material que vocês conhecem."),
          ("03","Call em cerca de dez dias para verem funcionando. O desenho comercial conversamos a partir daí.")]
ps = "".join(f'<div style="margin:26px 0;font-size:21px"><span class="num">{n}</span>{t}</div>' for n,t in passos)
S.append(f"""<div class="slide light">
<div class="label bz">PRÓXIMO PASSO</div>
<h1 style="font-size:36px;margin-top:26px">Um piloto sobre um caso <span class="it bz">que vocês conhecem</span>.</h1>
<div style="margin-top:46px">{ps}</div>
{foot(False,6)}</div>""")

# 7 fechamento
S.append(f"""<div class="slide dark">
<div class="mono-wm" style="margin-top:200px">{mono('#EDE9E5')}<span class="wm" style="font-size:28px">MANDOR</span></div>
<h1 style="font-size:38px;margin-top:40px;max-width:1000px">Não vim vender. Vim propor que a gente <span class="it bzl">rode junto</span>.</h1>
<p class="bzl" style="font-family:'Hanken Grotesk',sans-serif;font-weight:700;letter-spacing:.1em;font-size:17px;margin-top:40px">www.mandor.com.br</p>
{foot(True,7)}</div>""")

deck_html = f"<!doctype html><html lang='pt-br'><head><meta charset='utf-8'>{FONTS}<style>{DECK_CSS}</style></head><body>{''.join(S)}</body></html>"
(HERE/"_deck.html").write_text(deck_html, encoding="utf-8")

# ---------- MAPA ----------
md_txt = (HERE/"Mapa-Reuniao-Assis-MA.md").read_text(encoding="utf-8")
body = markdown.markdown(md_txt, extensions=["extra","sane_lists"])
MAPA_CSS = """
*{box-sizing:border-box}
html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
@page{size:A4;margin:20mm 18mm}
body{font-family:'Newsreader',serif;color:#211F1A;font-size:12.5pt;line-height:1.5;max-width:760px}
h1{font-weight:500;font-size:25pt;color:#211F1A;border-bottom:2px solid #8C6F45;padding-bottom:10px;margin:0 0 6px}
h2{font-family:'Hanken Grotesk',sans-serif;font-weight:700;font-size:11pt;letter-spacing:.12em;
  text-transform:uppercase;color:#8C6F45;margin:30px 0 10px;border-top:1px solid #Dcd; padding-top:14px}
h3{font-weight:600;font-size:14pt;color:#211F1A;margin:20px 0 6px}
p{margin:8px 0}strong{color:#1a1814}
ul{margin:8px 0 8px 4px;padding-left:20px}li{margin:5px 0}
blockquote{border-left:3px solid #8C6F45;background:#EDE9E5;margin:14px 0;padding:10px 18px;
  color:#3d3a34;font-style:italic}
hr{border:none;border-top:1px solid #d8d1c6;margin:22px 0}
code{background:#EDE9E5;padding:1px 5px;border-radius:3px;font-size:11pt}
"""
mapa_html = f"<!doctype html><html lang='pt-br'><head><meta charset='utf-8'>{FONTS}<style>{MAPA_CSS}</style></head><body>{body}</body></html>"
(HERE/"_mapa.html").write_text(mapa_html, encoding="utf-8")
print("HTML gerado: _deck.html + _mapa.html")
