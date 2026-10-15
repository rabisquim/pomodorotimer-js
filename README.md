# Pomodoro Clock

Timer da **Técnica Pomodoro** com visual dark lo-fi, anel de progresso e rádio embutida para acompanhar os estudos.

A Técnica Pomodoro é um método de gerenciamento de tempo criado por Francesco Cirillo no fim dos anos 80. Ela divide o trabalho em intervalos (tradicionalmente 25 minutos) separados por pequenas pausas, ajudando a manter o foco e evitar a fadiga.

## Funcionalidades

- **Anel de progresso** que esvazia conforme o tempo passa.
- **Sessões** de Foco, Pausa curta e Pausa longa, com cores próprias.
- **Durações configuráveis** (foco, pausas e número de ciclos) salvas no navegador.
- **Ciclos automáticos**: após N focos, entra na pausa longa.
- **Auto-iniciar** a próxima sessão (opcional).
- **Pular** e **Reiniciar** a qualquer momento.
- **Alarme sonoro** e **notificação** ao fim de cada sessão.
- **Rádio lo-fi** embutida (YouTube) com play/pause.
- **Timer sem drift**: o tempo é calculado por timestamp, não por contagem simples.
- Layout **responsivo**.

## Tecnologias

- HTML, CSS e JavaScript puro (vanilla), sem build.
- SVG para o anel de progresso.
- `localStorage` para persistir as configurações.
- YouTube IFrame API para a rádio.

## Estrutura do projeto

```
.
├── index.html
├── assets/
│   └── alarm-sound.mp3
├── scripts/
│   └── script.js
└── styles/
    └── style.css
```

## Como executar

Abra o `index.html` no navegador — o timer funciona direto assim.

Para a **rádio** funcionar, é preciso servir a página por HTTP (o YouTube não permite embed em `file://`):

```bash
python3 -m http.server
```

Depois acesse `http://localhost:8000`.

## Testar online

[Clique aqui](https://pomodorotimer-js.netlify.app/) para testar.

## Autor

[Robson Paulo](https://github.com/rabisquim)
