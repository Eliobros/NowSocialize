import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { register, sendVerificationCode, verifyCode } from '@/services/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSendCode = async () => {
    if (!email || !name) {
      setError('Preencha nome e email para enviar o código.');
      return;
    }
    setError('');
    setSendingCode(true);
    try {
      const result = await sendVerificationCode(email, name);
      if (result.success) {
        setCodeSent(true);
        setSuccessMsg(result.message || 'Código enviado!');
      } else {
        setError(result.error || 'Erro ao enviar código');
      }
    } catch {
      setError('Erro de conexão ao enviar código.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCodeInput) {
      setError('Digite o código de verificação.');
      return;
    }
    setError('');
    setVerifyingCode(true);
    try {
      const result = await verifyCode(email, verificationCodeInput);
      if (result.success) {
        setCodeVerified(true);
        setVerificationToken(result.verificationToken);
        setSuccessMsg((result.message || 'Verificado!') + ' Agora você pode criar sua conta.');
      } else {
        setError(result.error || 'Erro ao verificar código');
      }
    } catch {
      setError('Erro de conexão ao verificar código.');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    setSuccessMsg('');
    if (!codeVerified) {
      setError('Verifique seu e-mail antes de criar a conta.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      const result = await register({ name, email, username, password, verificationToken });
      if (result.success) {
        router.replace('/(tabs)/feed');
      } else {
        setError(result.error || 'Erro ao criar conta');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Criar Conta no{'\n'}<Text style={styles.titleHighlight}>SocializeNow</Text></Text>
          <Text style={styles.subtitle}>Preencha os dados abaixo para criar sua conta</Text>
        </View>

        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
        {successMsg ? <View style={styles.successBox}><Text style={styles.successText}>{successMsg}</Text></View> : null}

        <View style={styles.form}>
          <Text style={styles.label}>Nome Completo</Text>
          <TextInput style={styles.input} placeholder="Seu nome completo" placeholderTextColor={Colors.textMuted} value={name} onChangeText={setName} editable={!codeSent} />

          <Text style={styles.label}>Email</Text>
          <View style={styles.row}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="seu@email.com" placeholderTextColor={Colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={!codeSent} />
            <TouchableOpacity style={[styles.smallButton, codeSent && styles.disabledButton]} onPress={handleSendCode} disabled={sendingCode || codeSent}>
              {sendingCode ? <ActivityIndicator color={Colors.white} size="small" /> : <Text style={styles.smallButtonText}>{codeSent ? '✓ Enviado' : 'Enviar'}</Text>}
            </TouchableOpacity>
          </View>

          {codeSent && (
            <>
              <Text style={styles.label}>Código de Verificação</Text>
              <View style={styles.row}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Código de 6 dígitos" placeholderTextColor={Colors.textMuted} value={verificationCodeInput} onChangeText={setVerificationCodeInput} keyboardType="number-pad" editable={!codeVerified} />
                <TouchableOpacity style={[styles.smallButton, codeVerified && styles.disabledButton]} onPress={handleVerifyCode} disabled={verifyingCode || codeVerified}>
                  {verifyingCode ? <ActivityIndicator color={Colors.white} size="small" /> : <Text style={styles.smallButtonText}>{codeVerified ? '✓' : 'Verificar'}</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}

          <Text style={styles.label}>Nome de Usuário</Text>
          <TextInput style={styles.input} placeholder="ex: habibo_dev" placeholderTextColor={Colors.textMuted} value={username} onChangeText={setUsername} autoCapitalize="none" />

          <Text style={styles.label}>Senha</Text>
          <View style={styles.passwordContainer}>
            <TextInput style={styles.passwordInput} placeholder="Mínimo 6 caracteres" placeholderTextColor={Colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirmar Senha</Text>
          <TextInput style={styles.input} placeholder="Confirme sua senha" placeholderTextColor={Colors.textMuted} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} />

          <TouchableOpacity style={[styles.primaryButton, (!codeVerified) && styles.disabledButton]} onPress={handleRegister} disabled={loading || !codeVerified}>
            {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryButtonText}>Criar Conta</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Já tem uma conta? </Text>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={styles.linkText}>Fazer login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2FF' },
  scrollContent: { flexGrow: 1, padding: 24, paddingTop: 60 },
  backButton: { position: 'absolute', top: 50, left: 0, zIndex: 10 },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.text, marginBottom: 8 },
  titleHighlight: { color: Colors.primary },
  subtitle: { fontSize: 15, color: Colors.textSecondary },
  errorBox: { backgroundColor: '#FEE2E2', padding: 12, borderRadius: 8, marginBottom: 12 },
  errorText: { color: Colors.error, fontSize: 14 },
  successBox: { backgroundColor: '#DCFCE7', padding: 12, borderRadius: 8, marginBottom: 12 },
  successText: { color: '#15803D', fontSize: 14 },
  form: { gap: 2 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 14, fontSize: 16, color: Colors.text },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  smallButton: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 10 },
  smallButtonText: { color: Colors.white, fontWeight: '600', fontSize: 14 },
  disabledButton: { opacity: 0.5 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14 },
  passwordInput: { flex: 1, paddingVertical: 14, fontSize: 16, color: Colors.text },
  primaryButton: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  primaryButtonText: { color: Colors.white, fontSize: 18, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24, marginBottom: 40 },
  footerText: { color: Colors.textSecondary, fontSize: 14 },
  linkText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
});
