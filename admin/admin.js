const API='https://api.podlesnytwins.com';
const auth=document.getElementById('auth'),crm=document.getElementById('crm');
const login=document.getElementById('login'),code=document.getElementById('code'),setup=document.getElementById('setup');
let pendingEmail='';
async function api(path,options={}){return fetch(API+path,{credentials:'include',headers:{'Content-Type':'application/json'},...options});}
function error(form,text){const el=form.querySelector('.checkout-error');el.textContent=text;el.hidden=!text;}
function authPane(name){login.hidden=name!=='login';code.hidden=name!=='code';setup.hidden=name!=='setup';}
document.getElementById('setup-open').onclick=()=>{setup.elements.email.value=login.elements.email.value;authPane('setup');};
document.getElementById('login-open').onclick=()=>authPane('login');
login.onsubmit=async e=>{e.preventDefault();error(login,'');const body={email:login.elements.email.value.trim(),password:login.elements.password.value};const res=await api('/api/admin/login/password',{method:'POST',body:JSON.stringify(body)});if(!res.ok){error(login,res.status===429?'Слишком много попыток. Попробуйте позже.':'Почта или пароль не подошли.');return;}pendingEmail=body.email;code.querySelector('.target-email').textContent=pendingEmail;login.elements.password.value='';authPane('code');};
code.onsubmit=async e=>{e.preventDefault();error(code,'');const res=await api('/api/admin/login/code',{method:'POST',body:JSON.stringify({email:pendingEmail,code:code.elements.code.value})});if(!res.ok){error(code,'Код не подошёл или устарел.');return;}code.elements.code.value='';await load();};
document.getElementById('send-setup').onclick=async()=>{const email=setup.elements.email.value.trim();if(!email){error(setup,'Введите рабочую почту.');return;}await api('/api/admin/password/code',{method:'POST',body:JSON.stringify({email,purpose:'reset'})});error(setup,'');document.getElementById('send-setup').textContent='Код отправлен';};
setup.onsubmit=async e=>{e.preventDefault();error(setup,'');const body={email:setup.elements.email.value.trim(),purpose:'reset',code:setup.elements.code.value,password:setup.elements.password.value};const res=await api('/api/admin/password',{method:'POST',body:JSON.stringify(body)});if(!res.ok){error(setup,'Код устарел, либо пароль короче 12 символов.');return;}pendingEmail=body.email;setup.reset();login.elements.email.value=pendingEmail;authPane('login');error(login,'Пароль сохранён. Теперь войдите.');};
function metric(label,value){return `<div class="metric"><span>${label}</span><b>${value}</b></div>`;}
function esc(v){const d=document.createElement('div');d.textContent=v??'';return d.innerHTML;}
function deviceMarkup(device){
  const name=device.name||`Устройство ${device.id}`;
  return `<div class="device-entry"><span class="device-copy"><b>${esc(name)}</b><span>${esc(device.product)} · ${esc(device.id)}</span></span><button class="btn btn-secondary btn-small btn-danger release" type="button" data-product="${esc(device.product)}" data-device="${esc(device.id)}" data-name="${esc(name)}">Отвязать</button></div>`;
}
function confirmRelease(order,button){
  return window.confirm(
    `Отвязать «${button.dataset.name}»?\n\n`+
    `Продукт: ${button.dataset.product}\nЗаказ: ${order}\n\n`+
    'Будет освобождено только место этого устройства. Покупка и файл лицензии останутся действующими.'
  );
}
async function dashboard(q=''){
  const res=await api('/api/admin/dashboard?q='+encodeURIComponent(q));
  if(res.status===401){auth.hidden=false;crm.hidden=true;return;}
  const data=await res.json();
  document.getElementById('metrics').innerHTML=metric('Всего заказов',data.summary.orders)+metric('Оплачено, ₽',Number(data.summary.revenue).toFixed(2))+metric('Бесплатных выдач',data.summary.free??0)+metric('Подарков',data.summary.gifts??0)+metric('Согласий на письма',data.summary.subscribers??0)+data.products.map(p=>metric(esc(p.title||p.product),`${p.orders} / ${Number(p.revenue).toFixed(2)} ₽`)).join('');
  document.getElementById('csv').href=API+'/api/admin/export.csv?q='+encodeURIComponent(q);
  const box=document.getElementById('orders');box.textContent='';
  if(!data.orders.length){box.innerHTML='<tr><td colspan="7">Заказов по этому запросу нет. Измените строку поиска.</td></tr>';return;}
  data.orders.forEach(o=>{
    const tr=document.createElement('tr');
    const devices=o.device_rows.map(deviceMarkup).join('');
    tr.innerHTML=`<td>${esc(new Date(o.created_at).toLocaleDateString('ru-RU'))}<small>${esc(o.order)}</small></td><td>${esc(o.name)}<small>${esc(o.email)}${o.marketing?' · письма':''}</small></td><td>${esc(o.title||o.product)}</td><td class="status-${esc(o.status.toLowerCase())}">${esc(o.status_label||o.status)}<small>${o.delivered?'письмо отправлено':'не доставлено'}</small></td><td>${esc(o.amount)} ₽</td><td><span class="device-count">${o.devices}</span>${devices}</td><td><div class="row-actions">${o.free?'':'<button class="btn btn-secondary btn-small resend">Повторить письмо</button>'}</div></td>`;
    const resend=tr.querySelector('.resend');if(resend)resend.onclick=()=>action('/api/admin/order/resend',{order:o.order},'Письмо отправлено повторно.');
    tr.querySelectorAll('.release').forEach(btn=>btn.onclick=async()=>{
      if(!confirmRelease(o.order,btn))return;
      btn.disabled=true;btn.textContent='Отвязываем…';
      const ok=await action('/api/admin/device/release',{order:o.order,product:btn.dataset.product,device:btn.dataset.device},'Место устройства освобождено.');
      if(!ok){btn.disabled=false;btn.textContent='Отвязать';}
    });
    box.append(tr);
  });
}
async function action(path,body,ok){
  const message=document.getElementById('crm-message');
  try{
    const res=await api(path,{method:'POST',body:JSON.stringify(body)});
    message.textContent=res.ok?ok:'Операция не выполнена.';
    if(res.ok)await dashboard(document.getElementById('search').elements.q.value);
    return res.ok;
  }catch{
    message.textContent='Нет связи с сервером. Изменения не применены.';
    return false;
  }
}
async function load(){const res=await api('/api/admin/me');if(!res.ok){auth.hidden=false;crm.hidden=true;authPane('login');return;}const me=await res.json();document.getElementById('admin-email').textContent=me.email;auth.hidden=true;crm.hidden=false;document.getElementById('logout').hidden=false;await dashboard();}
document.getElementById('search').onsubmit=e=>{e.preventDefault();dashboard(e.target.elements.q.value);};
document.getElementById('logout').onclick=async()=>{await api('/api/admin/logout',{method:'POST'});location.reload();};
load();
