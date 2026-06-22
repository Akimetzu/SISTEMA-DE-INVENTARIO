import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/auth/login', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ nombre_usuario: 'admin.master', password: 'password123' })
    });
    const data = (await res.json()) as any;
    console.log("LOGIN RESPONSE:", res.status, data);

    const prods = await fetch('http://localhost:3000/api/productos', {
       headers: { 'Authorization': `Bearer ${data.token}` }
    });
    console.log("PRODS:", prods.status, await prods.json());

  } catch (err) {
    console.error("ERROR:", err);
  }
}
test();
