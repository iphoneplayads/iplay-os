/**
 * Logotipo oficial iPlay — usar o arquivo original, sem redesenhar.
 * Sobre fundo escuro (Noite), conforme o guia. Abaixo de 120 px de largura,
 * prefira contextos onde a assinatura caiba; nunca esticar ou alterar proporção.
 */
export function Logo({ height = 32, className }: { height?: number; className?: string }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}brand/logo-iplay.png`}
      alt="iPlay — Conserto de iPhone. Onde você estiver."
      height={height}
      style={{ height, width: 'auto' }}
      className={className}
      draggable={false}
    />
  );
}
