Acá tenés una explicación clara y ordenada de tu app, pensada para que la puedas defender oralmente sin trabarte con tecnicismos.

Qué hace la app en términos generales

Es una simulación de la sección de transferencias de una billetera virtual. El flujo es: elegís un contacto → ves sus datos bancarios → cargás un monto y lo transferís, con validaciones y un comprobante final. Son 3 pantallas conectadas por navegación.

1. Por qué usé "pantallas" en vez de todo en un solo archivo/vista

Podría haber hecho todo con useState y mostrar u ocultar vistas con condicionales (if), pero eso no refleja cómo funciona una app real. Usé React Navigation, que es la librería estándar de la industria para manejar el paso entre pantallas en apps de React Native — cada pantalla es un componente separado, y navegar entre ellas es como cambiar de "página" pero dentro de la misma app, sin recargar nada.

Stack.Navigator es como una pila de cartas: cada pantalla nueva se "apila" arriba de la anterior.
navigation.navigate('NombrePantalla', { datos }) avanza a la siguiente pantalla y le puede mandar información.
navigation.goBack() saca la carta de arriba y vuelve a la anterior — así funciona el botón de flecha del header.

Decisión técnica: usé @react-navigation/stack (la versión en JavaScript puro) en vez de native-stack (la versión que depende de módulos nativos). Elegí esta por estabilidad: en el entorno de desarrollo que estoy usando (Expo Snack), la versión nativa tenía errores de compatibilidad con la última versión del SDK. La versión en JS es 100% equivalente en funcionalidad para este proyecto, solo cambia un poco la animación de transición.

2. Cómo viaja la información entre pantallas

Cuando tocás un contacto en la lista, no copio sus datos en variables sueltas: le paso el objeto contacto completo como parámetro de navegación:

javascript
navigation.navigate('PerfilDestinatario', { contacto: item })

Y la pantalla siguiente lo recibe con route.params. Esto evita tener que buscar el contacto de nuevo o duplicar datos — viaja "adentro" de la navegación misma.

3. Por qué el saldo necesita algo más que un simple useState (Context API)

Al principio tenía el saldo como un estado dentro de la pantalla del formulario. El problema: cada vez que volvías a esa pantalla, React la "vuelve a montar desde cero", y el saldo se reiniciaba a $50.000 — como si nunca hubieras transferido nada.

La solución fue sacar el saldo de la pantalla y ponerlo en un lugar más "alto" y compartido: el Context API de React.

SaldoContext es como una caja de almacenamiento global.
SaldoProvider es el componente que de verdad guarda el número y sabe cómo modificarlo (descontarSaldo).
Lo envolví alrededor de todo el NavigationContainer, para que todas las pantallas puedan leer y modificar ese mismo saldo, sin importar cuántas veces entrás y salís de cada una.
useSaldo() es un atajo (hook personalizado) para no tener que escribir código repetido en cada pantalla que necesita el saldo.

Para defenderlo: esto demuestra manejo de estado global, un concepto central en apps reales — cualquier billetera virtual necesita que el saldo sea consistente en toda la app, no solo en la pantalla donde lo usás.

4. Las 3 pantallas, una por una

Pantalla 1 — Contactos Frecuentes: una FlatList (lista optimizada de React Native, solo renderiza lo que se ve en pantalla, ideal para listas largas) que muestra nombre, alias y banco de cada contacto. Al tocar uno, navega al perfil.

Pantalla 2 — Perfil del Destinatario: muestra los datos bancarios completos (alias, CBU, banco) del contacto elegido, con un botón "Transferir Dinero" que lleva al formulario.

Pantalla 3 — Formulario de Transferencia: muestra el saldo actual, y dos campos de entrada (TextInput): monto y motivo/concepto.

5. Las validaciones (la parte más importante para defender)

Antes de ejecutar la transferencia, se chequea en orden:

¿El monto es un número válido y mayor a cero? Uso parseFloat para convertir el texto ingresado a número, y isNaN para detectar si lo que escribieron no es un número real. Si falla, se corta ahí con una alerta.
¿El monto supera el saldo disponible? Si montoNumerico > saldo, se muestra el mensaje de error pedido exactamente ("Saldo insuficiente para realizar esta transacción") y no se hace nada más.
Si pasa ambas validaciones: se descuenta el saldo con descontarSaldo(), se arma un texto con los datos de la operación (comprobante virtual) y se muestra en un Alert. Al tocar "Aceptar", se vuelve automáticamente a la pantalla inicial con navigation.navigate('ContactosFrecuentes').

Esto es "validación financiera" en el sentido de que ninguna operación se ejecuta sin pasar los controles — el estado (saldo) solo cambia si todo es válido.

6. Decisiones de diseño visual
Tema oscuro: elegí una paleta de verde lima (
#B8F23D) sobre fondo oscuro (
#111411), buscando un estilo moderno tipo fintech.
SafeAreaView: evita que el contenido quede tapado por el notch/cámara del celular o la barra de estado — respeta el "área segura" visible de cada dispositivo.
StatusBar style="light": como el fondo de la app es oscuro, le pido al sistema operativo que muestre los íconos de la barra de estado (hora, batería, señal) en blanco, para que se puedan leer sobre el fondo oscuro.
Componente Header reutilizable: en vez de repetir el mismo bloque de código (flecha + título) en las 3 pantallas, lo extraje a un componente propio que recibe title y onBack como props — esto es una buena práctica de React: evitar duplicar código (principio DRY, "Don't Repeat Yourself").

Si te preguntan por qué elegiste cada cosa, la idea central para responder siempre es: separar responsabilidades (cada pantalla hace una sola cosa), no duplicar código (Header reutilizable, formatearMoneda como función), y manejar el estado en el lugar correcto (Context para lo que es global, useState para lo que es local de cada pantalla).