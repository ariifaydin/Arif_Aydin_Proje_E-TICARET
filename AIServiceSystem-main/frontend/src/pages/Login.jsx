import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [isLoginView, setIsLoginView] = useState(true); // true ise Giriş, false ise Kayıt Görünümü
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // İstek atılacak URL ve Gövdeyi görünüme göre dinamik seçiyoruz
    const url = isLoginView 
      ? 'http://localhost:8001/api/auth/login' 
      : 'http://localhost:8001/api/auth/register';

    const bodyData = isLoginView 
      ? { email, password } 
      : { email, name, password };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'İşlem başarısız oldu.');
      }

      if (isLoginView) {
        // GİRİŞ İŞLEMİ BAŞARILIYSA:
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/');
      } else {
        // KAYIT İŞLEMİ BAŞARILIYSA:
        setSuccess('Kayıt başarıyla tamamlandı! Giriş yapabilirsiniz.');
        setIsLoginView(true); // Giriş ekranına geri at
        setName('');
        setPassword('');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <h2 style={styles.logo}>hepsiburada</h2>
        <p style={styles.subtitle}>{isLoginView ? 'Giriş Yap' : 'Ücretsiz Kayıt Ol'}</p>
        
        {error && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>{success}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Sadece Kayıt Ol ekranındayken Ad Soyad alanını göster */}
          {!isLoginView && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Ad Soyad</label>
              <input
                type="text"
                value={name}
                placeholder="Arif Aydın"
                onChange={(e) => setName(e.target.value)}
                style={styles.input}
                required
              />
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>E-posta Adresi</label>
            <input
              type="email"
              value={email}
              placeholder="ornek@email.com"
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Şifre</label>
            <input
              type="password"
              value={password}
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <button type="submit" style={styles.button}>
            {isLoginView ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>
        </form>

        <div style={styles.footerText}>
          {isLoginView ? (
            <>
              Henüz hesabın yok mu?{' '}
              <span style={styles.link} onClick={() => { setIsLoginView(false); setError(''); }}>
                Ücretsiz kayıt ol
              </span>
            </>
          ) : (
            <>
              Zaten hesabın var mı?{' '}
              <span style={styles.link} onClick={() => { setIsLoginView(true); setError(''); }}>
                Giriş yap
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#f4f4f4',
    fontFamily: 'Arial, sans-serif',
  },
  loginBox: {
    width: '400px',
    padding: '40px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
    textAlign: 'center',
  },
  logo: {
    color: '#ff6000',
    fontSize: '28px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
  },
  subtitle: {
    fontSize: '18px',
    color: '#333',
    fontWeight: '600',
    marginBottom: '25px',
  },
  form: {
    textAlign: 'left',
  },
  inputGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    color: '#666',
    marginBottom: '6px',
    fontWeight: '500',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
    color: '#000000', // Yazı rengini tam siyah yaptık
    opacity: 1,
  },
  button: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#ff6000',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '10px',
  },
  errorBox: {
    backgroundColor: '#fff1f0',
    color: '#f5222d',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '15px',
    fontSize: '14px',
    border: '1px solid #ffa39e',
  },
  successBox: {
    backgroundColor: '#f6ffed',
    color: '#52c41a',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '15px',
    fontSize: '14px',
    border: '1px solid #b7eb8f',
  },
  footerText: {
    marginTop: '25px',
    fontSize: '14px',
    color: '#666',
  },
  link: {
    color: '#ff6000',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
};

export default Login;