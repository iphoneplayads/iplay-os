/** Janela ocupada entre seleção e confirmação (ou corrida real). */
export class WindowTakenError extends Error {
  constructor() {
    super('Esta janela acabou de ser ocupada. Escolha outro dia ou janela.');
    this.name = 'WindowTakenError';
  }
}
