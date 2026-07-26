require('dotenv').config({path:__dirname+'/.env.local'});
const {createClient}=require('@supabase/supabase-js');
const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ME='ac0530e4-fa88-4508-ac3a-e1e1a75c9b78';
(async()=>{
  for(;;){
    const {data,error}=await sb.from('staff_push_tokens').select('user_id,platform,created_at').eq('user_id',ME);
    if(error){ console.error('ERR', error.message); }
    else if((data||[]).length>0){ console.log('TOKEN_OK ' + JSON.stringify(data)); process.exit(0); }
    await new Promise(r=>setTimeout(r,15000));
  }
})();
