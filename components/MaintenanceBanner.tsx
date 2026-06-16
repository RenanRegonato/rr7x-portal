// Faixa fixa avisando o admin que a manutenção está ATIVA (ele tem bypass e
// continua navegando, mas os clientes estão vendo a página de manutenção).
// Renderizado pelo layout apenas para admin quando o modo está ligado.
export default function MaintenanceBanner() {
  return (
    <div className="sticky top-0 z-50 bg-warn text-white text-[12.5px] font-medium px-4 py-1.5 text-center">
      Modo manutenção ATIVO — clientes veem a página de manutenção. Você está navegando como admin.
    </div>
  )
}
