const cleanString=(value)=>String(value??'').trim();

export function requiredText(value,label){
  const result=cleanString(value);
  if(!result) throw new Error(label+' is required');
  return result;
}

export function normalizePhone(value){
  return cleanString(value).replace(/[^0-9+]/g,'');
}

export function validatePhone(value){
  const phone=normalizePhone(value);
  const digits=phone.replace(/\D/g,'');
  if(digits.length<10) throw new Error('Valid phone number required');
  return phone;
}

export function positiveMoney(value,label='Amount'){
  const amount=Number(value);
  if(!Number.isFinite(amount)||amount<=0) throw new Error(label+' must be greater than 0');
  return Math.round((amount+Number.EPSILON)*100)/100;
}

export function nonNegativeMoney(value,label='Amount'){
  const amount=Number(value);
  if(!Number.isFinite(amount)||amount<0) throw new Error(label+' must be 0 or greater');
  return Math.round((amount+Number.EPSILON)*100)/100;
}

export function normalizeDate(value){
  const date=value?new Date(value):new Date();
  if(Number.isNaN(date.getTime())) throw new Error('Invalid date');
  return date.toISOString();
}

export function normalizeError(error,fallback='Something went wrong'){
  return error?.message?String(error.message):fallback;
}
