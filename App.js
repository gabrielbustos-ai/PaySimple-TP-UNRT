import { useState } from 'react';
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
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Feather } from '@expo/vector-icons';

const CONTACTOS = [
  { id: '1', name: 'Juan Pérez', alias: 'juan.perez.mp', cbu: '0000003100012345678901', banco: 'Banco Nación' },
  { id: '2', name: 'María López', alias: 'maria.lopez', cbu: '0000003100098765432109', banco: 'Banco Galicia' },
  { id: '4', name: 'Carlos Gómez', alias: 'carlos.g', cbu: '0000003100055551234567', banco: 'Banco Santander' },
];

const SALDO_INICIAL = 50000;

const Stack = createStackNavigator();

// Header reutilizable para no repetir código en cada pantalla
function Header({ title, onBack }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.iconButton} onPress={onBack} activeOpacity={0.7}>
        <Feather name="chevron-left" size={26} color="#000" />
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

      <FlatList
        data={CONTACTOS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.contactCard}
            onPress={() => navigation.navigate('PerfilDestinatario', { contacto: item })}>
            <Text style={styles.contactName}>{item.name}</Text>
            <Text style={styles.contactSub}>{item.alias} · {item.banco}</Text>
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
      <Header title="Datos del destinatario" onBack={() => navigation.goBack()} />

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
          onPress={() => navigation.navigate('FormularioTransferencia', { contacto })}>
          <Text style={styles.botonPrimarioTexto}>Transferir Dinero</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ---------- PANTALLA 3: Formulario de transferencia ----------
function FormularioTransferenciaScreen({ route, navigation }) {
  const { contacto } = route.params;
  const [saldo, setSaldo] = useState(SALDO_INICIAL);
  const [monto, setMonto] = useState('');
  const [motivo, setMotivo] = useState('');

  const formatearMoneda = (valor) =>
    valor.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

  const confirmarTransferencia = () => {
    const montoNumerico = parseFloat(monto.replace(',', '.'));

    // Validación 1: monto no numérico o <= 0
    if (isNaN(montoNumerico) || montoNumerico <= 0) {
      Alert.alert('Monto inválido', 'El monto a transferir debe ser mayor a cero.');
      return;
    }

    // Validación 2: saldo insuficiente
    if (montoNumerico > saldo) {
      Alert.alert('Error', 'Saldo insuficiente para realizar esta transacción');
      return;
    }

    // Transferencia OK: descontamos saldo y mostramos comprobante
    const nuevoSaldo = saldo - montoNumerico;
    setSaldo(nuevoSaldo);

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
          Transferís a <Text style={{ fontWeight: '700' }}>{contacto.name}</Text>
        </Text>

        <Text style={styles.inputLabel}>Monto a transferir</Text>
        <TextInput
          style={styles.input}
          placeholder="$0"
          keyboardType="numeric"
          value={monto}
          onChangeText={setMonto}
        />

        <Text style={styles.inputLabel}>Motivo / Concepto</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Varios, Alquiler"
          value={motivo}
          onChangeText={setMotivo}
        />

        <TouchableOpacity style={styles.botonPrimario} onPress={confirmarTransferencia}>
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
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="ContactosFrecuentes"
          screenOptions={{ headerShown: false }}>
          <Stack.Screen name="ContactosFrecuentes" component={ContactosFrecuentesScreen} />
          <Stack.Screen name="PerfilDestinatario" component={PerfilDestinatarioScreen} />
          <Stack.Screen name="FormularioTransferencia" component={FormularioTransferenciaScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f2f2f2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f2f2f2',
    paddingTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 8,
  },
  subtitle: {
    color: '#000',
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
  list: {
    paddingHorizontal: 12,
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  contactSub: {
    fontSize: 13,
    color: '#777',
    marginTop: 2,
  },
  perfilContainer: {
    alignItems: 'center',
    padding: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0057ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  perfilNombre: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 20,
  },
  datosBancarios: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 24,
  },
  datoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  datoLabel: {
    color: '#777',
    fontSize: 14,
  },
  datoValor: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  botonPrimario: {
    backgroundColor: '#0057ff',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  botonPrimarioTexto: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  formContainer: {
    padding: 20,
  },
  saldoBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  saldoLabel: {
    color: '#777',
    fontSize: 13,
  },
  saldoValor: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginTop: 4,
  },
  destinatarioTexto: {
    fontSize: 14,
    color: '#333',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    color: '#555',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 4,
  },
});