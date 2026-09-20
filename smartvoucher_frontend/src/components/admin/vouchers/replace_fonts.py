import re
path = r'e:\Dhsg-CNTT\Hk2-N4\DACN\Fontend\smartvoucher_frontend\src\components\admin\vouchers\VoucherForm.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('className="text-[11px] text-red-500 font-bold ml-1"', 'className="text-xs text-red-500 font-medium ml-1 mt-1"')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
