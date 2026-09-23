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
import { Feather } from '@expo/vector-icons';

import { CUENTAS_VALIDAS } from './data/cuentasValidas';
import { guardarContactoEnNube, obtenerContactos } from './firebaseConfig';

const SALDO_INICIAL = 50000;
const Stack = createStackNavigator();
const SaldoContext = createContext();

function SaldoProvider({ children }) {
  const [saldo, setSaldo] = useState(SALDO_INICIAL);
  const descontarSaldo = (monto) => setSaldo((s) => s - monto);
  return (
    <SaldoContext.Provider value={{ saldo, descontarSaldo }}>
      {children}
    </SaldoContext.Provider>
  );
}
function useSaldo() {
  return useContext(SaldoContext);
}

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

// Busca en el "sistema bancario" simulado por CBU exacto o alias (sin importar mayúsculas)
function buscarCuentaValida(query) {
  const texto = query.trim();
  if (!texto) return null;
  const textoLower = texto.toLowerCase();
  return (
    CUENTAS_VALIDAS.find(
      (cuenta) =>
        cuenta.cbu === texto || cuenta.alias.toLowerCase() === textoLower
    ) || null
  );
}

// ---------- PANTALLA 1: Contactos frecuentes ----------
function ContactosFrecuentesScreen({ navigation }) {
  const [busqueda, setBusqueda] = useState('');
  const [contactos, setContactos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargarContactos = useCallback(async () => {
    setCargando(true);
    try {
      const lista = await obtenerContactos();
      setContactos(lista);
    } catch (error) {
      Alert.alert(
        'Error',
        'No se pudieron cargar los contactos: ' + error.message
      );
    } finally {
      setCargando(false);
    }
  }, []);

  // Se re-ejecuta cada vez que esta pantalla vuelve a estar visible
  // (por ejemplo, al volver después de agregar un contacto nuevo)
  useFocusEffect(
    useCallback(() => {
      cargarContactos();
    }, [cargarContactos])
  );

  const handleBuscar = () => {
    const cuenta = buscarCuentaValida(busqueda);

    if (!cuenta) {
      Alert.alert(
        'No encontrada',
        'No existe ninguna cuenta con ese CBU o alias.'
      );
      return;
    }

    setBusqueda('');
    navigation.navigate('PerfilDestinatario', {
      contacto: cuenta,
      esNuevo: true,
    });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <Header title="Transferir" onBack={() => navigation.goBack()} />

      <View style={styles.buscadorContainer}>
        <TextInput
          style={styles.buscadorInput}
          placeholder="Ingresá CBU o alias"
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

      <View style={styles.contactosHeader}>
        <Text style={styles.contactosTitulo}>Contactos frecuentes</Text>
        <Text style={styles.contactosDescripcion}>
          Elegí a quién querés transferir dinero
        </Text>
      </View>

      {cargando ? (
        <ActivityIndicator color="#B8F23D" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={contactos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.contactosDescripcion}>
              Todavía no tenés contactos guardados. Buscá un CBU o alias para
              agregar uno.
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.contactCard}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate('PerfilDestinatario', {
                  contacto: item,
                  esNuevo: false,
                })
              }>
              <View style={styles.contactAvatar}>
                <Text style={styles.contactAvatarText}>
                  {item.name.charAt(0)}
                </Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{item.name}</Text>
                <Text style={styles.contactSub}>{item.alias}</Text>
                <Text style={styles.contactBank}>{item.banco}</Text>
              </View>
              <Feather name="chevron-right" size={21} color="#999" />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ---------- PANTALLA 2: Perfil del destinatario ----------
function PerfilDestinatarioScreen({ route, navigation }) {
  const { contacto, esNuevo } = route.params;
  const [guardando, setGuardando] = useState(false);
  const [yaAgregado, setYaAgregado] = useState(!esNuevo);

  const handleAgregarContacto = async () => {
    setGuardando(true);
    try {
      await guardarContactoEnNube(contacto);
      setYaAgregado(true);
      Alert.alert('Listo', `${contacto.name} se agregó a tus contactos.`);
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
              {
                backgroundColor: '#1A1E1A',
                borderWidth: 1,
                borderColor: '#292E29',
                marginBottom: 10,
              },
            ]}
            onPress={handleAgregarContacto}
            disabled={guardando}>
            <Text style={[styles.botonPrimarioTexto, { color: '#F2F4EF' }]}>
              {guardando ? 'Agregando...' : 'Agregar a mis contactos'}
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

// ---------- PANTALLA 3: Formulario de transferencia (sin cambios) ----------
function FormularioTransferenciaScreen({ route, navigation }) {
  const { contacto } = route.params;
  const { saldo, descontarSaldo } = useSaldo();
  const [monto, setMonto] = useState('');
  const [motivo, setMotivo] = useState('');

  const formatearMoneda = (valor) =>
    valor.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

  const confirmarTransferencia = () => {
    const montoNumerico = parseFloat(monto.replace(',', '.'));

    if (isNaN(montoNumerico) || montoNumerico <= 0) {
      Alert.alert(
        'Monto inválido',
        'El monto a transferir debe ser mayor a cero.'
      );
      return;
    }
    if (montoNumerico > saldo) {
      Alert.alert('Error', 'Saldo insuficiente para realizar esta transacción');
      return;
    }

    descontarSaldo(montoNumerico);
    const nuevoSaldo = saldo - montoNumerico;

    Alert.alert(
      'Transferencia exitosa',
      `Comprobante virtual\n\nDestinatario: ${contacto.name}\nCBU/Alias: ${
        contacto.alias
      }\nMonto: ${formatearMoneda(montoNumerico)}\nConcepto: ${
        motivo || 'Varios'
      }\nSaldo restante: ${formatearMoneda(nuevoSaldo)}`,
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
          onPress={confirmarTransferencia}>
          <Text style={styles.botonPrimarioTexto}>Confirmar transferencia</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ---------- NAVEGACIÓN RAÍZ (sin cambios) ----------
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

  /* CONTACTOS FRECUENTES */

  contactosHeader: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 18,
  },

  contactosTitulo: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F2F4EF',
  },

  contactosDescripcion: {
    fontSize: 14,
    color: '#A3A8A1',
    marginTop: 5,
  },

  list: {
    paddingHorizontal: 16,
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
});
