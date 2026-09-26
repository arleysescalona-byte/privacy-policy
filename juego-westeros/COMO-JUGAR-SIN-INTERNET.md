# El Trono de Hierro — cómo jugar sin internet

El juego completo es **un solo archivo**: `westeros-sin-internet.html` (unos 330 KB).
No necesita internet, ni instalar nada, ni crear cuentas.

## Cómo pasarlo a tus amigos
Por WhatsApp o Telegram (como documento), Bluetooth, Nearby Share / Quick Share, AirDrop, cable USB o memoria USB.

## Cómo abrirlo

**PC (Windows, Mac o Linux)**
Doble clic en el archivo. Se abre en Chrome, Edge, Firefox o Safari.

**Celular Android**
1. Guarda el archivo en el teléfono (Descargas).
2. Ábrelo desde la app *Archivos* y elige **Chrome** (o Firefox / Samsung Internet).
   Si WhatsApp lo abre en un visor de texto, usa "Abrir con…" → Chrome.

**iPhone / iPad**
La vista previa de la app *Archivos* no ejecuta juegos, así que tócalo y elige
**Compartir → Abrir en Safari** si aparece. Si no, usa una app gratuita para abrir
archivos HTML (por ejemplo *Documents* de Readdle) y ábrelo con su navegador.

## Bueno saber
- La partida **se guarda sola** en ese dispositivo y navegador. Al volver aparece "Continuar partida".
- Es un juego para una persona contra el ordenador. Cada amigo juega en su propio dispositivo.
- En el celular, gíralo en vertical: el mapa arriba y los botones abajo (Reclutar, Terminar turno).

## Para quien mantiene el juego
Tras editar `index.html`, regenera el archivo sin internet con:
`python3 juego-westeros/build_offline.py` (este paso sí necesita internet, para bajar las tipografías).
