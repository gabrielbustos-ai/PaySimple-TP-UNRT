import { useState, useContext, createContext, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { CUENTAS_VALIDAS } from './data/cuentasValidas';
import {
  obtenerFavoritos,
  agregarFavorito,
  eliminarFavorito,
  obtenerRecientes,
  registrarTransferencia,
} from './firebaseConfig';

const SALDO_INICIAL = 50000;

const Stack = createStackNavigator();

// ---------- CONTEXTO GLOBAL DE SALDO ----------
const SaldoContext = createContext();

function SaldoProvider({ children }) {
  const [saldo, setSaldo] = useState(SALDO_INICIAL);

  const descontarSaldo = (monto) => {
    setSaldo((saldoActual) => saldoActual - monto);
  };

  return (
    <SaldoContext.Provider value={{ saldo, descontarSaldo }}>
      {children}
    </SaldoContext.Provider>
  );
}

function useSaldo() {
  return useContext(SaldoContext);
}

// Header reutilizable para no repetir código en cada pantalla
function Header({ title, onBack }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={onBack}
        activeOpacity={0.7}>
        <Feather name="chevron-left" size={26} color="#F2F4EF" />
      </TouchableOpacity>
      <Text style={styles.subtitle}>{title}</Text>
      <View style={styles.iconButton} />
    </View>
  );
}

// ---------- PANTALLA 1: Contactos frecuentes (Recientes / Favoritos) ----------
function ContactosFrecuentesScreen({ navigation }) {
  const [busqueda, setBusqueda] = useState('');
  const [favoritos, setFavoritos] = useState([]);
  const [recientes, setRecientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState('recientes'); // 'recientes' | 'favoritos'

  const cargarContactos = useCallback(async () => {
    setCargando(true);
    try {
      const [listaFavoritos, listaRecientes] = await Promise.all([
        obtenerFavoritos(),
        obtenerRecientes(),
      ]);
      setFavoritos(listaFavoritos);
      setRecientes(listaRecientes);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los contactos: ' + error.message);
    } finally {
      setCargando(false);
    }
  }, []);

  // Se re-ejecuta cada vez que esta pantalla vuelve a estar en foco
  // (por ejemplo, al volver después de una transferencia o de agregar un favorito)
  useFocusEffect(
    useCallback(() => {
      cargarContactos();
    }, [cargarContactos])
  );

  // Le agregamos a cada item si también es favorito, comparando por CBU,
  // así el corazón se muestra bien sin importar de qué colección vino el dato
  const listaActual =
    tab === 'recientes'
      ? recientes.map((r) => ({
          ...r,
          esFavorito: favoritos.some((f) => f.cbu === r.cbu),
        }))
      : favoritos.map((f) => ({ ...f, esFavorito: true }));

  const handleToggleFavorito = async (item) => {
    const favoritoExistente = favoritos.find((f) => f.cbu === item.cbu);

    if (favoritoExistente) {
      // Actualización optimista: lo sacamos de la vista antes de que responda Firestore
      setFavoritos((prev) => prev.filter((f) => f.cbu !== item.cbu));
      try {
        await eliminarFavorito(favoritoExistente.id);
      } catch (error) {
        setFavoritos((prev) => [...prev, favoritoExistente]); // revertimos si falla
        Alert.alert('Error', 'No se pudo quitar de favoritos.');
      }
    } else {
      const temporal = { ...item, id: `temp-${item.cbu}` };
      setFavoritos((prev) => [...prev, temporal]);
      try {
        const nuevo = await agregarFavorito(item);
        setFavoritos((prev) => prev.map((f) => (f.id === temporal.id ? nuevo : f)));
      } catch (error) {
        setFavoritos((prev) => prev.filter((f) => f.id !== temporal.id));
        Alert.alert('Error', 'No se pudo agregar a favoritos.');
      }
    }
  };

  const handleBuscar = () => {
    const texto = busqueda.trim();
    if (!texto) return;
    const textoLower = texto.toLowerCase();

    const cuenta = CUENTAS_VALIDAS.find(
      (c) => c.cbu === texto || c.alias.toLowerCase() === textoLower
    );

    if (!cuenta) {
      Alert.alert('No encontrada', 'No existe ninguna cuenta con ese CBU o alias.');
      return;
    }

    setBusqueda('');
    navigation.navigate('PerfilDestinatario', { contacto: cuenta });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <Header title="Transferir dinero" onBack={() => navigation.goBack()} />

      <View style={styles.buscadorContainer}>
        <TextInput
          style={styles.buscadorInput}
          placeholder="Ingresá alias, CBU/CVU o contacto"
          placeholderTextColor="#8F958E"
          value={busqueda}
          onChangeText={setBusqueda}
          autoCapitalize="none"
          onSubmitEditing={handleBuscar}
        />
        <TouchableOpacity style={styles.buscadorBoton} onPress={handleBuscar}>
          <Feather name="search" size={20} color="#111411" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity style={styles.tabBoton} onPress={() => setTab('recientes')}>
          <Text style={[styles.tabTexto, tab === 'recientes' && styles.tabTextoActivo]}>
            Recientes
          </Text>
          {tab === 'recientes' && <View style={styles.tabIndicador} />}
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabBoton} onPress={() => setTab('favoritos')}>
          <Text style={[styles.tabTexto, tab === 'favoritos' && styles.tabTextoActivo]}>
            Favoritos
          </Text>
          {tab === 'favoritos' && <View style={styles.tabIndicador} />}
        </TouchableOpacity>
      </View>

      {cargando ? (
        <ActivityIndicator color="#B8F23D" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={listaActual}
          keyExtractor={(item) => item.cbu}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.contactosDescripcion}>
              {tab === 'recientes'
                ? 'Todavía no le transferiste a nadie.'
                : 'Todavía no tenés favoritos. Tocá el corazón para agregar uno.'}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.contactCard}>
              <TouchableOpacity
                style={styles.contactCardInfo}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('PerfilDestinatario', { contacto: item })}>
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactAvatarText}>{item.name.charAt(0)}</Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{item.name}</Text>
                  <Text style={styles.contactBank}>{item.banco}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleToggleFavorito(item)} style={styles.iconButton}>
                <MaterialCommunityIcons
                  name={item.esFavorito ? 'heart' : 'heart-outline'}
                  size={22}
                  color={item.esFavorito ? '#B8F23D' : '#8F958E'}
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.iconButton}>
                <Feather name="more-vertical" size={20} color="#8F958E" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ---------- PANTALLA 2: Perfil del destinatario ----------
function PerfilDestinatarioScreen({ route, navigation }) {
  const { contacto } = route.params;
  const [guardando, setGuardando] = useState(false);
  const [yaAgregado, setYaAgregado] = useState(false);

  const handleAgregarFavorito = async () => {
    setGuardando(true);
    try {
      await agregarFavorito(contacto);
      setYaAgregado(true);
      Alert.alert('Listo', `${contacto.name} se agregó a tus favoritos.`);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <Header
        title="Datos del destinatario"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.perfilContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{contacto.name.charAt(0)}</Text>
        </View>

        <Text style={styles.perfilNombre}>{contacto.name}</Text>

        <View style={styles.datosBancarios}>
          <View style={styles.datoRow}>
            <Text style={styles.datoLabel}>Alias</Text>
            <Text style={styles.datoValor}>{contacto.alias}</Text>
          </View>
          <View style={styles.datoRow}>
            <Text style={styles.datoLabel}>CBU</Text>
            <Text style={styles.datoValor}>{contacto.cbu}</Text>
          </View>
          <View style={styles.datoRow}>
            <Text style={styles.datoLabel}>Banco</Text>
            <Text style={styles.datoValor}>{contacto.banco}</Text>
          </View>
        </View>

        {!yaAgregado && (
          <TouchableOpacity
            style={[
              styles.botonPrimario,
              { backgroundColor: '#1A1E1A', borderWidth: 1, borderColor: '#292E29', marginBottom: 10 },
            ]}
            onPress={handleAgregarFavorito}
            disabled={guardando}>
            <Text style={[styles.botonPrimarioTexto, { color: '#F2F4EF' }]}>
              {guardando ? 'Agregando...' : 'Agregar a favoritos'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.botonPrimario}
          onPress={() =>
            navigation.navigate('FormularioTransferencia', { contacto })
          }>
          <Text style={styles.botonPrimarioTexto}>Transferir Dinero</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ---------- PANTALLA 3: Formulario de transferencia ----------
function FormularioTransferenciaScreen({ route, navigation }) {
  const { contacto } = route.params;
  const { saldo, descontarSaldo } = useSaldo();
  const [monto, setMonto] = useState('');
  const [motivo, setMotivo] = useState('');
  const [procesando, setProcesando] = useState(false);

  const formatearMoneda = (valor) =>
    valor.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

  const confirmarTransferencia = async () => {
    const montoNumerico = parseFloat(monto.replace(',', '.'));

    // Validación 1: monto no numérico o <= 0
    if (isNaN(montoNumerico) || montoNumerico <= 0) {
      Alert.alert(
        'Monto inválido',
        'El monto a transferir debe ser mayor a cero.'
      );
      return;
    }

    // Validación 2: saldo insuficiente
    if (montoNumerico > saldo) {
      Alert.alert('Error', 'Saldo insuficiente para realizar esta transacción');
      return;
    }

    // Transferencia OK: descontamos saldo
    setProcesando(true);
    descontarSaldo(montoNumerico);
    const nuevoSaldo = saldo - montoNumerico;

    try {
      await registrarTransferencia(contacto);
    } catch (error) {
      console.log('No se pudo registrar como reciente:', error.message);
      // No bloqueamos la transferencia por esto, ya se descontó el saldo
    } finally {
      setProcesando(false);
    }

    Alert.alert(
      'Transferencia exitosa',
      `Comprobante virtual\n\n` +
        `Destinatario: ${contacto.name}\n` +
        `CBU/Alias: ${contacto.alias}\n` +
        `Monto: ${formatearMoneda(montoNumerico)}\n` +
        `Concepto: ${motivo || 'Varios'}\n` +
        `Saldo restante: ${formatearMoneda(nuevoSaldo)}`,
      [
        {
          text: 'Aceptar',
          onPress: () => navigation.navigate('ContactosFrecuentes'),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <Header title="Transferir dinero" onBack={() => navigation.goBack()} />

      <View style={styles.formContainer}>
        <View style={styles.saldoBox}>
          <Text style={styles.saldoLabel}>Saldo disponible</Text>
          <Text style={styles.saldoValor}>{formatearMoneda(saldo)}</Text>
        </View>

        <Text style={styles.destinatarioTexto}>
          Transferís a{' '}
          <Text style={{ fontWeight: '700' }}>{contacto.name}</Text>
        </Text>

        <Text style={styles.inputLabel}>Monto a transferir</Text>
        <TextInput
          style={styles.input}
          placeholder="$0"
          placeholderTextColor="#8F958E"
          keyboardType="numeric"
          value={monto}
          onChangeText={setMonto}
        />

        <Text style={styles.inputLabel}>Motivo / Concepto</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Varios, Alquiler"
          placeholderTextColor="#8F958E"
          value={motivo}
          onChangeText={setMotivo}
        />

        <TouchableOpacity
          style={styles.botonPrimario}
          onPress={confirmarTransferencia}
          disabled={procesando}>
          <Text style={styles.botonPrimarioTexto}>
            {procesando ? 'Procesando...' : 'Confirmar transferencia'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ---------- NAVEGACIÓN RAÍZ ----------
export default function App() {
  return (
    <SafeAreaProvider>
      <SaldoProvider>
        <StatusBar style="light" backgroundColor="#111411" />
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="ContactosFrecuentes"
            screenOptions={{ headerShown: false }}>
            <Stack.Screen
              name="ContactosFrecuentes"
              component={ContactosFrecuentesScreen}
            />
            <Stack.Screen
              name="PerfilDestinatario"
              component={PerfilDestinatarioScreen}
            />
            <Stack.Screen
              name="FormularioTransferencia"
              component={FormularioTransferenciaScreen}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SaldoProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#111411',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111411',
    paddingTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 8,
  },

  subtitle: {
    color: '#F2F4EF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },

  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* BUSCADOR */

  buscadorContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 6,
    gap: 8,
  },

  buscadorInput: {
    flex: 1,
    backgroundColor: '#1A1E1A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#F2F4EF',
    borderWidth: 1,
    borderColor: '#292E29',
  },

  buscadorBoton: {
    width: 46,
    backgroundColor: '#B8F23D',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* TABS RECIENTES / FAVORITOS */

  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#292E29',
  },

  tabBoton: {
    marginRight: 28,
    paddingBottom: 10,
    alignItems: 'center',
  },

  tabTexto: {
    fontSize: 15,
    color: '#8F958E',
    fontWeight: '600',
  },

  tabTextoActivo: {
    color: '#B8F23D',
  },

  tabIndicador: {
    height: 2,
    width: '100%',
    backgroundColor: '#B8F23D',
    marginTop: 8,
    borderRadius: 2,
  },

  /* CONTACTOS FRECUENTES */

  contactosDescripcion: {
    fontSize: 14,
    color: '#A3A8A1',
    paddingHorizontal: 16,
    marginTop: 12,
  },

  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },

  contactCard: {
    backgroundColor: '#1A1E1A',
    borderRadius: 16,
    padding: 15,
    marginBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#292E29',
  },

  contactCardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#B8F23D',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },

  contactAvatarText: {
    color: '#111411',
    fontSize: 19,
    fontWeight: '700',
  },

  contactInfo: {
    flex: 1,
  },

  contactName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F2F4EF',
  },

  contactSub: {
    fontSize: 13,
    color: '#B8BDB6',
    marginTop: 4,
  },

  contactBank: {
    fontSize: 12,
    color: '#7F857E',
    marginTop: 3,
  },

  /* PERFIL DEL DESTINATARIO */

  perfilContainer: {
    alignItems: 'center',
    padding: 20,
  },

  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#B8F23D',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },

  avatarText: {
    color: '#111411',
    fontSize: 28,
    fontWeight: '700',
  },

  perfilNombre: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F2F4EF',
    marginTop: 12,
    marginBottom: 20,
  },

  datosBancarios: {
    width: '100%',
    backgroundColor: '#1A1E1A',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#292E29',
  },

  datoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#292E29',
  },

  datoLabel: {
    color: '#8F958E',
    fontSize: 14,
  },

  datoValor: {
    color: '#F2F4EF',
    fontSize: 14,
    fontWeight: '600',
  },

  /* BOTÓN PRINCIPAL */

  botonPrimario: {
    backgroundColor: '#B8F23D',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },

  botonPrimarioTexto: {
    color: '#111411',
    fontSize: 15,
    fontWeight: '700',
  },

  /* FORMULARIO DE TRANSFERENCIA */

  formContainer: {
    padding: 20,
  },

  saldoBox: {
    backgroundColor: '#1A1E1A',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#292E29',
  },

  saldoLabel: {
    color: '#8F958E',
    fontSize: 13,
  },

  saldoValor: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F2F4EF',
    marginTop: 4,
  },

  destinatarioTexto: {
    fontSize: 14,
    color: '#B8BDB6',
    marginBottom: 16,
  },

  inputLabel: {
    fontSize: 13,
    color: '#A3A8A1',
    marginBottom: 6,
    marginTop: 10,
  },

  input: {
    backgroundColor: '#1A1E1A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#F2F4EF',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#292E29',
  },
});