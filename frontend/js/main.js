// Arquivo JS principal do frontend (sem frameworks, conforme definido no TCC)

const API_URL = 'http://localhost:3000/api';

document.getElementById('testar-api').addEventListener('click', async () => {
  const resultadoEl = document.getElementById('resultado');
  resultadoEl.textContent = 'Testando...';

  try {
    const response = await fetch(`${API_URL}/health/db`);
    const data = await response.json();

    if (data.status === 'ok') {
      resultadoEl.textContent = `Tudo certo! Horario do banco: ${data.horario_banco}`;
      resultadoEl.style.color = 'green';
    } else {
      resultadoEl.textContent = `Erro: ${data.message}`;
      resultadoEl.style.color = 'red';
    }
  } catch (error) {
    resultadoEl.textContent = 'Nao foi possivel conectar ao backend. Ele esta rodando?';
    resultadoEl.style.color = 'red';
  }
});
