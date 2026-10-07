-- Criação manual de OS em uma única transação autenticada.
create or replace function public.create_manual_service_order(
 p_client_id uuid,p_client jsonb,p_model_name text,p_device jsonb,p_address jsonb,
 p_scheduled_date date,p_scheduled_time time,p_notes text,p_pix_total numeric,p_card_total numeric,p_items jsonb
) returns table(service_order_id uuid,order_number bigint)
language plpgsql security definer set search_path=public as $$
declare
 v_company uuid; v_client uuid; v_model uuid; v_device uuid; v_address uuid; v_appt uuid; v_order uuid; v_number bigint;
 v_first jsonb; v_item jsonb; v_service uuid; v_option uuid; v_price uuid;
begin
 select pr.company_id into v_company from public.profiles pr where pr.id=auth.uid() and pr.role='admin';
 if v_company is null then raise exception 'NOT_AUTHORIZED'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'ITEMS_REQUIRED'; end if;
 if p_client_id is not null then
  select c.id into v_client from public.clients c where c.id=p_client_id and c.company_id=v_company;
  if v_client is null then raise exception 'CLIENT_NOT_FOUND'; end if;
 else
  insert into public.clients(company_id,name,phone,whatsapp,email,cpf)
  values(v_company,btrim(p_client->>'name'),btrim(p_client->>'phone'),nullif(btrim(p_client->>'whatsapp'),''),nullif(btrim(p_client->>'email'),''),nullif(btrim(p_client->>'cpf'),'')) returning id into v_client;
 end if;
 select m.id into v_model from public.device_models m where m.company_id=v_company and lower(m.name)=lower(btrim(p_model_name)) and m.active=true limit 1;
 if v_model is null then raise exception 'MODEL_NOT_FOUND'; end if;
 insert into public.devices(company_id,client_id,model_id,imei,serial_number,notes)
 values(v_company,v_client,v_model,nullif(btrim(p_device->>'imei'),''),nullif(btrim(p_device->>'serial_number'),''),nullif(p_device->>'notes','')) returning id into v_device;
 if p_address is not null and jsonb_typeof(p_address)='object' then
  insert into public.addresses(company_id,client_id,zip_code,street,number,complement,neighborhood,city,state,reference)
  values(v_company,v_client,coalesce(p_address->>'zip_code',''),coalesce(p_address->>'street',''),coalesce(p_address->>'number',''),nullif(p_address->>'complement',''),coalesce(p_address->>'neighborhood',''),coalesce(nullif(p_address->>'city',''),'Rio de Janeiro'),coalesce(nullif(p_address->>'state',''),'RJ'),nullif(p_address->>'reference','')) returning id into v_address;
 end if;
 v_first:=p_items->0; v_service:=nullif(v_first->>'service_id','')::uuid; v_option:=nullif(v_first->>'service_option_id','')::uuid; v_price:=nullif(v_first->>'price_id','')::uuid;
 if not exists(select 1 from public.services s where s.id=v_service and s.company_id=v_company and s.active=true) then raise exception 'SERVICE_NOT_FOUND'; end if;
 if v_price is not null and not exists(select 1 from public.prices p where p.id=v_price and p.company_id=v_company and p.active=true) then raise exception 'PRICE_NOT_FOUND'; end if;
 insert into public.appointments(company_id,client_id,device_id,service_id,service_option_id,price_id,scheduled_date,scheduled_start_time,status,service_mode,address_id,notes,source,quoted_pix_total,quoted_card_total)
 values(v_company,v_client,v_device,v_service,v_option,v_price,p_scheduled_date,p_scheduled_time,'confirmed','mobile',v_address,p_notes,'gestao_manual',p_pix_total,p_card_total) returning id into v_appt;
 select so.id,so.order_number into v_order,v_number from public.service_orders so where so.appointment_id=v_appt;
 if v_order is null then raise exception 'SERVICE_ORDER_NOT_CREATED'; end if;
 delete from public.service_order_items soi where soi.service_order_id=v_order;
 for v_item in select value from jsonb_array_elements(p_items) loop
  v_service:=nullif(v_item->>'service_id','')::uuid; v_option:=nullif(v_item->>'service_option_id','')::uuid; v_price:=nullif(v_item->>'price_id','')::uuid;
  if not exists(select 1 from public.services s where s.id=v_service and s.company_id=v_company and s.active=true) then raise exception 'SERVICE_NOT_FOUND'; end if;
  if v_price is not null and not exists(select 1 from public.prices p where p.id=v_price and p.company_id=v_company and p.active=true) then raise exception 'PRICE_NOT_FOUND'; end if;
  insert into public.service_order_items(company_id,service_order_id,service_id,service_option_id,price_id,description,quantity,unit_pix,unit_card,discount)
  values(v_company,v_order,v_service,v_option,v_price,coalesce(nullif(v_item->>'description',''),'Serviço'),greatest(coalesce((v_item->>'quantity')::int,1),1),coalesce((v_item->>'unit_pix')::numeric,0),coalesce((v_item->>'unit_card')::numeric,0),coalesce((v_item->>'discount')::numeric,0));
 end loop;
 update public.service_orders so set imei=nullif(btrim(p_device->>'imei'),''),serial_number=nullif(btrim(p_device->>'serial_number'),''),intake_notes=nullif(p_device->>'intake_notes',''),technical_notes=nullif(p_device->>'technical_notes',''),quoted_pix_total=p_pix_total,quoted_card_total=p_card_total,source='gestao_manual' where so.id=v_order;
 return query select v_order,v_number;
end $$;
revoke all on function public.create_manual_service_order(uuid,jsonb,text,jsonb,jsonb,date,time,text,numeric,numeric,jsonb) from public,anon;
grant execute on function public.create_manual_service_order(uuid,jsonb,text,jsonb,jsonb,date,time,text,numeric,numeric,jsonb) to authenticated;
