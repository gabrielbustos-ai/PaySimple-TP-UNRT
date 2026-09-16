import { useState, useContext, createContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Feather } from '@expo/vector-icons';

const CONTACTOS = [
  {
    id: '1',
    name: 'Juan Pérez',
    alias: 'juan.perez.mp',
    cbu: '0000003100012345678901',
    banco: 'Mercado Pago',
  },
  {
    id: '2',
    name: 'María López',
    alias: 'maria.lopez',
    cbu: '0000003100098765432109',
    banco: 'Banco Galicia',
  },
  {
    id: '4',
    name: 'Carlos Gómez',
    alias: 'carlos.g',
    cbu: '0000003100055551234567',
    banco: 'Banco Santander',
  },
];

const SALDO_INICIAL = 50000;

const Stack = createStackNavigator();

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

// ---------- PANTALLA 1: Contactos frecuentes ----------
function ContactosFrecuentesScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <Header title="Transferir" onBack={() => navigation.goBack()} />

      <View style={styles.contactosHeader}>
        <Text style={styles.contactosTitulo}>Contactos frecuentes</Text>
        <Text style={styles.contactosDescripcion}>
          Elegí a quién querés transferir dinero
        </Text>
      </View>

      <FlatList
        data={CONTACTOS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.contactCard}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate('PerfilDestinatario', { contacto: item })
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
    </SafeAreaView>
  );
}

// ---------- PANTALLA 2: Perfil del destinatario ----------
function PerfilDestinatarioScreen({ route, navigation }) {
  const { contacto } = route.params;

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

  const formatearMoneda = (valor) =>
    valor.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

  const confirmarTransferencia = () => {
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

    // Transferencia OK: descontamos saldo y mostramos comprobante
    descontarSaldo(montoNumerico);
    const nuevoSaldo = saldo - montoNumerico;

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
          onPress={confirmarTransferencia}>
          <Text style={styles.botonPrimarioTexto}>Confirmar transferencia</Text>
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
    padding: 20
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
