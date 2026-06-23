import httpx, os
from dotenv import load_dotenv
load_dotenv()
r = httpx.get('https://openrouter.ai/api/v1/models', headers={'Authorization': f'Bearer {os.getenv("OPENROUTER_API_KEY")}'})
free = [m['id'] for m in r.json()['data'] if str(m.get('pricing',{}).get('prompt','1')) == '0']
print('Free models:')
for m in free: print(' -', m)
