/* Synchronous bootstrap is emitted before every business script. No event is replayed. */
export function startNotesRuntime(createCore, dataElement) {
  'use strict';
  const bundle=JSON.parse(dataElement.textContent).bundle,core=createCore(bundle.schema);let controller=null;
  const events=['pointerdown','pointerup','pointermove','mousedown','mouseup','mousemove','click','dblclick','contextmenu','touchstart','touchend','keydown','keyup','keypress','beforeinput','input','change','compositionstart','compositionupdate','compositionend','focus','blur','focusin','focusout','copy','cut','paste','selectstart','wheel'];
  const gate=event=>{
    if(!controller)return;const path=event.composedPath(),owned=path.includes(controller.host)||path.includes(controller.shadow);
    const pick=controller.picking&&(!owned||path.some(n=>n?.classList?.contains('picker')));
    if(!owned&&!pick){if(event.type==='click'||event.type==='keydown'){controller.businessEvent(event,path);queueMicrotask(()=>{controller.syncModal();controller.clearBusinessEvent();});}return;}
    event.stopImmediatePropagation(); // guard:early-tool-isolation
    if(pick){if(event.cancelable)event.preventDefault();controller.pickEvent(event);}else controller.toolEvent(event,path);
  };
  for(const type of events)window.addEventListener(type,gate,{capture:true,passive:false});
  document.addEventListener('DOMContentLoaded',()=>{
    const host=document.createElement('div');host.id='luca-notes-host';host.setAttribute('popover','manual');
    const shadow=host.attachShadow({mode:'open'}),style=document.createElement('style');style.textContent=bundle.css;shadow.append(style);
    const surface=document.createElement('div');shadow.append(surface);for(const type of events)shadow.addEventListener(type,gate,{capture:true,passive:false});
    let notes=core.clone(bundle.notes),state='CLOSED',resume='VIEW',buffer=null,allocation=null,selected=null,undoToken=null,lastDeletedId=null;
    const entryTriggers=new WeakMap();let lastEntryTrigger=null;
    let modal=null,hostLost=false,unsupported='',message='',dirty=false,returnFocus=null,composing=false,busy=false,side='right',collapsed=false;
    let fieldErrors={},pickerReturn='EDIT_LIST',rebindId=null,hoverTarget=null;
    let tree=[],treeSelected=null,search='';
    let needsResolution=false,observer=null,resizeObserver=null,raf=null,motionRaf=null,geometryTargets=new Map(),movingAnimations=new Set(),expandedCluster=null;
    const kinds={interaction:'交互说明',ui:'UI 说明',rule:'整体规则'},detailLabels={conditions:'触发条件',feedback:'可见反馈',exceptions:'例外',recovery:'返回与恢复',visual:'布局与适配 / 动效',keyboard:'键盘操作'};
    const templatePrompts=[['提交与处理','写清触发动作、处理中状态、成功或失败的反馈位置，以及完成后的去向。'],['输入与校验','写清接受条件、校验时机、错误反馈、输入保留和键盘操作。'],['列表与筛选','写清何时应用筛选、条件保留、无结果反馈及实际分页或滚动方式。'],['弹窗与抽屉','写清入口、初始焦点、背景操作、完成与取消、关闭后焦点去向。'],['UI 与动效','写清触发对象、可见变化及实际中断或减少动效行为。有据且随可用宽高伸缩或变化的大模块，才补“布局：…／适配：…”，小控件归父模块一次说明；尺寸与断点需有来源。']];
    const make=(tag,text,attrs={})=>{const el=document.createElement(tag);if(text!==null)el.textContent=text;for(const[k,v]of Object.entries(attrs))el.setAttribute(k,v);return el;};
    const button=(label,command,id,cls='')=>make('button',label,{'data-command':command,...(id?{'data-id':id}:{}),...(cls?{class:cls}:{})});
    const normalize=v=>String(v).replace(/\s+/g,' ').trim(),name=el=>el.getAttribute('aria-label')||normalize(el.textContent||'')||null;
    const fp=el=>({tag:el.tagName.toLowerCase(),role:el.getAttribute('role'),semantic_name:name(el)});
    const instance=el=>el.getAttribute('data-instance-key')||el.getAttribute('data-row-key')||null;
    const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
    function visible(el,respectModal=true){
      if(!el?.isConnected||el===host||el.closest('[hidden],[inert],[aria-hidden="true"]')||(respectModal&&modal&&!modal.contains(el)))return false;
      for(let p=el;p;p=p.parentElement){const s=getComputedStyle(p);if(s.display==='none'||s.visibility!=='visible'||s.contentVisibility==='hidden')return false;}
      const r=el.getBoundingClientRect();return r.width>0&&r.height>0;
    }
    function resolution(a){
      if(!a.anchor)return {target:null,status:'RULE'};
      if(a.anchor.requires_rebind||a.anchor.base_revision!==notes.base_revision)return {target:null,status:'REQUIRES_REBIND'};
      let roots,targets;try{roots=[...document.querySelectorAll(a.anchor.root_identity)];const matches=Array.isArray(bundle.bindings)?bundle.bindings.filter(t=>t.anchor_id===a.anchor.id):[],binding=matches.length===1&&equal(matches[0].fingerprint,a.anchor.fingerprint)?matches[0]:null,semantic=a.anchor.strategy==='semantic'&&a.anchor.locator.startsWith('#')?a.anchor.locator:binding?.source_locator?.startsWith('#')?binding.source_locator:null;targets=semantic?[...document.querySelectorAll(semantic)]:[];if(!targets.length)targets=[...document.querySelectorAll('[data-luca-note-anchor="'+CSS.escape(a.anchor.id)+'"]')];if(!targets.length)targets=[...document.querySelectorAll(binding?.source_locator||a.anchor.locator)];}catch{return {target:null,status:'INVALID_LOCATOR'};}
      if(roots.length!==1||targets.length!==1)return {target:null,status:targets.length>1||roots.length>1?'AMBIGUOUS_TARGET':'UNRESOLVED'};
      const target=targets[0];
      if(!roots[0].contains(target)||!equal(fp(target),a.anchor.fingerprint)||instance(target)!==a.anchor.instance_key)return {target:null,status:'REQUIRES_REBIND'};
      if(a.anchor.context_id!==a.page_or_state_context.id)return {target:null,status:'REQUIRES_REBIND'};
      return visible(target)?{target,status:'RESOLVED'}:{target:null,status:'UNRESOLVED'};
    }
    const locate=a=>a?resolution(a).target:null;
    function inViewport(el){
      const r=el.getBoundingClientRect();let left=Math.max(0,r.left),top=Math.max(0,r.top),right=Math.min(innerWidth,r.right),bottom=Math.min(innerHeight,r.bottom);if(right<=left||bottom<=top)return null;
      for(let p=el.parentElement;p;p=p.parentElement){const s=getComputedStyle(p);if(/(auto|scroll|hidden|clip)/.test(s.overflow+s.overflowX+s.overflowY)){const pr=p.getBoundingClientRect();left=Math.max(left,pr.left);top=Math.max(top,pr.top);right=Math.min(right,pr.right);bottom=Math.min(bottom,pr.bottom);}}
      return right>left&&bottom>top?{left,top,right,bottom}:null;
    }
    const focus=cmd=>shadow.querySelector('[data-command="'+cmd+'"]')?.focus({preventScroll:true});
    function activeNotes(){return notes.annotations.filter(a=>!a.tombstone);}
    function outline(target,preview=false){const r=target&&inViewport(target);if(!r)return;const box=make('div',null,{class:'target-outline'+(preview?' is-preview':''),'aria-hidden':'true','data-target':target.id});Object.assign(box.style,{left:r.left+'px',top:r.top+'px',width:r.right-r.left+'px',height:r.bottom-r.top+'px'});if(preview)box.append(make('span',name(target)||target.tagName.toLowerCase(),{class:'target-caption'}));surface.append(box);}
    function refresh(reuse=false){
      if(state==='CLOSED'||collapsed)return;
      const rows=activeNotes();if(selected&&!rows.some(a=>a.id===selected))selected=null;
      const count=shadow.querySelector('.count');if(count&&count.textContent!==rows.length+' 条')count.textContent=rows.length+' 条';
      if(!reuse)geometryTargets=new Map(rows.map(a=>[a.id,locate(a)]));
      // Geometry refresh retains interactive nodes and keyboard focus while membership is unchanged.
      const pins=new Map([...shadow.querySelectorAll('.pin')].map(el=>[el.dataset.pinKey,el])),menus=new Map([...shadow.querySelectorAll('.pin-cluster')].map(el=>[el.dataset.clusterKey,el]));
      for(const el of shadow.querySelectorAll('.target-outline'))el.remove();
      const groups=[];
      for(const a of rows){const target=geometryTargets.get(a.id),r=target?.isConnected&&inViewport(target);
        if(!r||unsupported||state.startsWith('PICK_'))continue;
        if(a.id===selected)outline(target);
        const x=r.left-12,y=r.top-12;let group=groups.find(g=>Math.abs(g.x-x)<44&&Math.abs(g.y-y)<44);if(!group){group={x,y,items:[]};groups.push(group);}group.items.push(a);
      }
      for(const group of groups){group.items.sort((a,b)=>a.display_number-b.display_number);const first=group.items[0],cluster=group.items.length>1,key=group.items.map(a=>a.id).join('|');
        let pin=pins.get(key);pins.delete(key);if(!pin){pin=button('',cluster?'cluster':'select',cluster?key:first.id,'pin');pin.dataset.pinKey=key;pin.append(make('span','',{class:'pin-dot'}));surface.append(pin);}
        pin.className='pin'+(group.items.some(a=>a.id===selected)?' is-selected':'');pin.querySelector('.pin-dot').textContent=cluster?String(group.items.length):String(first.display_number);pin.setAttribute('aria-label',cluster?group.items.length+' 条重叠说明':'说明 '+first.display_number+'：'+first.title);pin.setAttribute('aria-pressed',String(group.items.some(a=>a.id===selected)));pin.style.left=Math.max(0,group.x)+'px';pin.style.top=Math.max(0,group.y)+'px';
        if(cluster&&expandedCluster===key){let menu=menus.get(key);menus.delete(key);if(!menu){menu=make('div',null,{class:'pin-cluster','aria-label':'重叠说明','data-cluster-key':key});for(const a of group.items)menu.append(button(a.display_number+' '+a.title,'select',a.id));surface.append(menu);}Object.assign(menu.style,{left:Math.max(0,Math.min(innerWidth-200,group.x+44))+'px',top:Math.max(0,Math.min(innerHeight-160,group.y))+'px'});}
      }
      for(const el of [...pins.values(),...menus.values()])el.remove();
      if(state.startsWith('PICK_')&&hoverTarget)outline(hoverTarget,true);
      if(!reuse){movingAnimations.clear();const ancestors=new Set();for(const target of geometryTargets.values())for(let n=target;n;n=n.parentElement)ancestors.add(n);for(const n of ancestors)for(const a of n.getAnimations())if(isMoving(a))movingAnimations.add(a);}
      for(const a of movingAnimations)if(!isMoving(a))movingAnimations.delete(a);
      if(movingAnimations.size&&motionRaf===null)motionRaf=requestAnimationFrame(followGeometry);else if(!movingAnimations.size&&motionRaf!==null){cancelAnimationFrame(motionRaf);motionRaf=null;}
    }
    const isMoving=a=>a.playState==='running'&&a.playbackRate!==0&&a.effect?.target?.isConnected&&Number.isFinite(a.effect.getComputedTiming().endTime);
    function followGeometry(){motionRaf=null;if(state!=='CLOSED')refresh(true);}
    const schedule=(reuse=false)=>{needsResolution ||= reuse!==true;if(state!=='CLOSED'&&raf===null)raf=requestAnimationFrame(()=>{raf=null;syncModal();const resolve=needsResolution;needsResolution=false;refresh(!resolve);});};
    const scrollChanged=()=>schedule(true);
    const motionEvents=['animationstart','animationend','animationcancel','transitionrun','transitionend','transitioncancel'];
    const motionChanged=e=>{if([...geometryTargets.values()].some(t=>t&&e.target.contains?.(t)))schedule();};
    function observing(on){
      observer?.disconnect();resizeObserver?.disconnect();observer=resizeObserver=null;window.removeEventListener('scroll',scrollChanged,true);window.removeEventListener('resize',schedule);for(const t of motionEvents)window.removeEventListener(t,motionChanged,true);
      if(raf!==null)cancelAnimationFrame(raf);if(motionRaf!==null)cancelAnimationFrame(motionRaf);raf=motionRaf=null;movingAnimations.clear();geometryTargets.clear();
      if(on){observer=new MutationObserver(records=>{if(!host.isConnected){syncModal();return;}if(records.some(r=>r.target!==host&&!host.contains(r.target)&&!(r.type==='childList'&&[...r.addedNodes,...r.removedNodes].every(n=>n===host))))schedule();});observer.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});resizeObserver=new ResizeObserver(schedule);resizeObserver.observe(document.body);window.addEventListener('scroll',scrollChanged,true);window.addEventListener('resize',schedule);for(const t of motionEvents)window.addEventListener(t,motionChanged,true);}
    }
    function syncModal(){
      if(!host.isConnected)hostLost=true;const modals=[...document.querySelectorAll('dialog:modal')],next=modals.at(-1)||null;
      const reason=modals.length>1?'同时打开多个模态弹窗，当前不支持编辑。请先关闭多余弹窗。':hostLost?'说明宿主被页面移除，当前不支持继续编辑。输入仍保留，请重新打开原文件。':typeof host.showPopover!=='function'?'此浏览器不支持说明编辑所需的顶层显示。':'';
      if(next!==modal||!host.isConnected){const active=shadow.activeElement,range=active&&'selectionStart'in active?[active.selectionStart,active.selectionEnd]:null;modal=next;if(host.matches(':popover-open'))host.hidePopover();(modal||document.body).append(host);if(typeof host.showPopover==='function')host.showPopover();if(active?.isConnected){active.focus({preventScroll:true});if(range)active.setSelectionRange(...range);}}
      if(lastEntryTrigger&&state!=='CLOSED')currentContext();if(unsupported!==reason){unsupported=reason;if(unsupported&&state.startsWith('PICK_'))state=pickerReturn;render();}
    }
    async function transaction(args){const r=await core.applyManualTransaction({document:notes,...args},bundle.sources);if(!r.ok){message=r.message;return null;}notes=r.value.document;if(args.action!=='defer'&&args.action!=='cancel-reservation'){undoToken=r.value.undo_token;dirty=true;}return r.value;}
    function currentContext(){const custom=[...document.querySelectorAll('[aria-modal="true"]')].filter(el=>visible(el));const root=modal||custom.at(-1)||document.body;if(root!==document.body&&!entryTriggers.has(root)&&lastEntryTrigger)entryTriggers.set(root,lastEntryTrigger);return {root,context:root===document.body?{id:'page',title:'当前页面',entry_steps:[]}:{id:root.id||'modal',title:root.getAttribute('aria-label')||normalize(root.querySelector('h1,h2,h3,[role=heading]')?.textContent||'当前弹窗'),entry_steps:entryTriggers.has(root)?['点击“'+entryTriggers.get(root)+'”进入该状态']:[]}};}
    function selector(el){
      const parts=[];
      for(let n=el;n;n=n.parentElement){
        let atom=n.tagName.toLowerCase(),stable=false;
        if(n.id&&/^[A-Za-z][\w-]*$/.test(n.id)&&document.querySelectorAll('#'+n.id).length===1){atom='#'+n.id;stable=true;}
        else {const key=instance(n),attr=n.hasAttribute('data-instance-key')?'data-instance-key':'data-row-key';if(key&&!/["\[\]<>:\\]/.test(key)){atom='['+attr+'="'+key+'"]';stable=true;}else for(const c of n.classList)if(/^[A-Za-z_-][\w-]*$/.test(c))atom+='.'+c;}
        parts.unshift(atom);if(stable||n===document.body){const value=parts.join(' > ');if(!/\b(?:javascript|eval)\b/i.test(value)&&document.querySelectorAll(value).length===1)return value;}
        if(n===document.body)break;
      }
      return null;
    }
    function normalizeCandidate(el){const row=el.closest('tr,[role="row"]');if(row&&!row.getAttribute('data-row-key')&&!row.getAttribute('data-instance-key'))el=row.closest('table,[role="grid"],[role="list"]')||row.parentElement;while(el&&!selector(el))el=el.parentElement;return el;}
    function candidates(){const {root}=currentContext();const found=new Set();for(const el of root.querySelectorAll('*')){if(['SCRIPT','STYLE','LINK','META','TEMPLATE','BR','HR'].includes(el.tagName)||el===host||host.contains(el)||!visible(el)||el.parentElement?.closest('iframe,canvas'))continue;const target=normalizeCandidate(el);if(target&&visible(target))found.add(target);}return [...found];}
    function startPick(rebind=false,keyboard=false){pickerReturn=buffer?'EDIT_FORM':'EDIT_LIST';rebindId=rebind?buffer?.id:null;tree=candidates();treeSelected=tree[0]||null;search='';hoverTarget=null;state=keyboard?'PICK_TREE':'PICK_POINTER';message='选择真实可见区域；Esc 取消';render();if(keyboard)shadow.querySelector('[data-tree-search]')?.focus();else focus('cancel-pick');}
    function anchorFor(target){const {root,context}=currentContext(),stableParent=target.closest('[data-instance-key],[data-row-key]'),bindingRoot=stableParent&&root.contains(stableParent)?stableParent:root;return {context,anchor:{id:crypto.randomUUID(),base_revision:notes.base_revision,strategy:target.id?'semantic':'scoped',root_identity:selector(bindingRoot),locator:selector(target),context_id:context.id,instance_key:instance(target),fingerprint:fp(target),requires_rebind:false}};}
    async function newDraft(target=null){
      const reserved=await transaction({action:'reserve',annotation_id:crypto.randomUUID()});if(!reserved)return;allocation=reserved.allocation;
      const bound=target?anchorFor(target):{context:{id:'prototype',title:'全原型',entry_steps:[]},anchor:null};
      buffer={id:allocation.annotation_id,display_number:allocation.display_number,revision:1,binding_revision:target?1:0,title:'',kind:target?'interaction':'rule',body:'',details:{},source_refs:[],behavior_ids:[],evidence_status:'proposed',implementation_status:'not_demonstrated',creation_origin:'manual',generation_scope_id:null,scope_unit_id:null,page_or_state_context:bound.context,anchor:bound.anchor,field_origins:{},tombstone:null};
      selected=buffer.id;state='EDIT_FORM';fieldErrors={};message='编辑中，完成后请下载保存';render();shadow.querySelector('[data-field="title"]')?.focus();
    }
    async function confirmTarget(target){if(!target||!candidates().includes(target)){message='请选择可见区域';render();return;}hoverTarget=null;if(rebindId){const bound=anchorFor(target);if(allocation&&buffer?.id===rebindId){buffer.page_or_state_context=bound.context;buffer.anchor=bound.anchor;buffer.binding_revision++;message='区域已更新';}else{const r=await transaction({action:'rebind',annotation_id:rebindId,...bound});if(!r){render();return;}const old=notes.annotations.find(a=>a.id===rebindId);buffer={...core.clone(old),title:buffer.title,body:buffer.body,details:core.clone(buffer.details),kind:buffer.kind};}state='EDIT_FORM';render();shadow.querySelector('[data-field="title"]')?.focus();}else await newDraft(target);}
    async function save(){
      if(!buffer)return true;fieldErrors={};if(!buffer.title.trim())fieldErrors.title='请填写标题。';else if([...buffer.title].length>200)fieldErrors.title='标题不能超过 200 个字符。';if(!buffer.body.trim())fieldErrors.body='请填写主说明。';else if([...buffer.body].length>20000)fieldErrors.body='主说明不能超过 20,000 个字符。';
      for(const[k,v]of Object.entries(buffer.details))if([...v].length>20000)fieldErrors['details.'+k]='内容不能超过 20,000 个字符。';
      if(Object.keys(fieldErrors).length){message='请检查编辑内容。内容已保留。';render();shadow.querySelector('[data-field="'+Object.keys(fieldErrors)[0]+'"]')?.focus();return false;}
      const old=notes.annotations.find(a=>a.id===buffer.id);let result;
      if(old){const changes={};for(const p of ['title','body',...Object.keys(detailLabels).map(k=>'details.'+k)]){const v=p.startsWith('details.')?buffer.details[p.slice(8)]??null:buffer[p],previous=p.startsWith('details.')?old.details[p.slice(8)]??null:old[p];if(v!==previous)changes[p]=v;}
        if(!Object.keys(changes).length&&buffer.kind===old.kind&&equal(buffer.anchor,old.anchor)&&equal(buffer.page_or_state_context,old.page_or_state_context)){buffer=null;state='EDIT_LIST';return true;}
        result=await transaction({action:'edit',annotation_id:buffer.id,changes,kind:buffer.kind,context:buffer.page_or_state_context,...(!equal(buffer.anchor,old.anchor)?{anchor:buffer.anchor}:{})});
      }else result=await transaction({action:'add',annotation:buffer,allocation});
      if(!result){fieldErrors.body=message;render();shadow.querySelector('[data-field="body"]')?.focus();return false;}selected=buffer.id;buffer=null;allocation=null;state='EDIT_LIST';fieldErrors={};message='未导出修改';return true;
    }
    async function beginEdit(a){if(buffer?.id!==a.id){if(buffer&&!await save())return;buffer=core.clone(a);allocation=null;fieldErrors={};}selected=a.id;state='EDIT_FORM';message='编辑中，完成后请下载保存';render();shadow.querySelector('[data-field="title"]')?.focus();}
    function field(key,label,value,hint){const wrap=make('label',label),el=make(key==='title'?'input':'textarea',null,{'data-field':key,'aria-label':label,'aria-describedby':'pn-'+key+'-hint'+(fieldErrors[key]?' pn-'+key+'-error':'')});el.value=value;if(fieldErrors[key])el.setAttribute('aria-invalid','true');wrap.append(el,make('span',hint,{class:'hint',id:'pn-'+key+'-hint'}));const error=make('span',fieldErrors[key]||'',{class:'field-error',id:'pn-'+key+'-error',role:'alert'});error.hidden=!fieldErrors[key];wrap.append(error);return wrap;}
    function selectControl(label,key,options,value){const wrap=make('label',label,{class:'select-label'}),el=make('select',null,{'data-control':key,'aria-label':label});for(const[v,t]of options)el.append(make('option',t,{value:v}));el.value=value;wrap.append(el);return wrap;}
    function focusCard(){const card=shadow.querySelector('[data-card="'+selected+'"]');card?.scrollIntoView({block:'nearest'});card?.querySelector('[data-command="select"]')?.focus({preventScroll:true});}
    function focusComparison(){const next=shadow.querySelector('.compare [data-command="keep"]:not(:disabled)');if(next)next.focus({preventScroll:true});else{state='EDIT_LIST';render();focusCard();}}
    function displayBody(a){return a.body;}
    function statusNote(a){
      const labels=[];
      if(a.evidence_status==='proposed')labels.push('待确认');
      if(a.implementation_status==='not_demonstrated')labels.push('原型未演示');
      return labels.join(' · ');
    }
    function render(){
      const active=shadow.activeElement,remember=active?.dataset?{command:active.dataset.command,id:active.dataset.id,field:active.dataset.field,control:active.dataset.control,treeSearch:active.dataset.treeSearch,range:typeof active.selectionStart==='number'?[active.selectionStart,active.selectionEnd]:null}:null;
      const scroll=shadow.querySelector('.panel-scroll')?.scrollTop||0;surface.replaceChildren();const entry=button('交互说明','open',null,'entry');entry.hidden=state!=='CLOSED';surface.append(entry);if(state==='CLOSED')return;
      const rows=activeNotes();
      if(state==='PICK_POINTER')surface.append(make('div',null,{class:'picker','aria-hidden':'true'}));
      const narrow=innerWidth<640;if(narrow&&!collapsed&&state!=='PICK_POINTER')surface.append(make('div',null,{class:'tool-backdrop','aria-hidden':'true'}));
      const panel=make('section',null,{class:'panel is-'+side+(collapsed?' is-collapsed':''),'aria-label':'交互说明面板','data-state':state,...(narrow&&!collapsed?{role:'dialog','aria-modal':'true'}:{})});surface.append(panel);
      const header=make('header',null,{class:'panel-header'}),heading=make('div',null,{class:'heading'});heading.append(make('h2','交互说明'),make('span',rows.length+' 条',{class:'count'}));const close=button('×','close',null,'icon-button');close.setAttribute('aria-label','关闭说明');header.append(heading,close);panel.append(header);
      const tools=make('div',null,{class:'panel-tools'});tools.append(button(side==='right'?'移至左侧':'移至右侧','side',null,'quiet-button'),button(collapsed?'展开面板':'收起面板','collapse',null,'quiet-button'));panel.append(tools);if(collapsed)return;
      if(!['VIEW','EDIT_LIST','EDIT_FORM'].includes(state)){const toolbar=make('div',null,{class:'toolbar'});toolbar.append(make('span',{CREATE_KIND:'新增说明',PICK_POINTER:'选择说明区域',PICK_TREE:'键盘选择区域',COMPARE_FIELD:'字段更新建议'}[state],{class:'mode-label'}));if(state.startsWith('PICK_'))toolbar.append(button('取消选区','cancel-pick',null,'quiet-button'));else if(state==='COMPARE_FIELD')toolbar.append(button('暂缓处理','defer',null,'quiet-button'));panel.append(toolbar);}
      const content=make('div',null,{class:'panel-scroll'});panel.append(content);
      if(unsupported)content.append(make('p',unsupported,{role:'alert',class:'notice'}));
      else if(state==='CREATE_KIND'){const choices=make('div',null,{class:'choices'});choices.append(make('h3','这条说明适用于哪里？'),button('区域说明','new-region',null,'choice'),make('p','选择当前可见的页面模块、控件或区域。',{class:'hint'}),button('整体规则','new-rule',null,'choice'),make('p','记录跨区域的规则，不绑定目标、不显示标号。',{class:'hint'}),button('取消新建','cancel-create',null,'secondary-button'));content.append(choices);}
      else if(state.startsWith('PICK_')){const help=make('div',null,{class:'pick-help',role:'status'});help.append(make('strong',state==='PICK_POINTER'?'点击要说明的区域':'选择要说明的区域'),make('p','指针和键盘使用同一组真实可见目标。方向键选择父子或同级，Enter 确认，Esc 取消。'));content.append(help);const controls=make('div',null,{class:'picker-controls'});controls.append(button(state==='PICK_POINTER'?'使用键盘选择':'使用指针选择','pick-mode',null,'secondary-button'));content.append(controls);
        if(state==='PICK_TREE'){const input=make('input',null,{'data-tree-search':'true','aria-label':'搜索区域',placeholder:'搜索名称或元素类型'});input.value=search;content.append(input);const items=tree.filter(el=>visible(el)&&(!search||normalize((name(el)||'')+' '+el.tagName).toLowerCase().includes(search.toLowerCase())));const list=make('div',null,{role:'tree','aria-label':'可选区域'});for(const el of items){const index=tree.indexOf(el),b=button((name(el)||el.tagName.toLowerCase()).slice(0,160),'tree-select',String(index),'tree-item');b.setAttribute('role','treeitem');b.setAttribute('aria-selected',String(el===treeSelected));b.setAttribute('tabindex',el===treeSelected?'0':'-1');b.style.paddingLeft=Math.min(4,tree.filter(p=>p!==el&&p.contains(el)).length)*12+12+'px';list.append(b);}content.append(list);const confirm=button('确认区域','confirm-tree',null,'primary-button');confirm.disabled=!treeSelected||!visible(treeSelected);content.append(confirm);}}
      else if(state==='EDIT_FORM'&&buffer){const form=make('div',null,{class:'form','aria-label':'编辑说明 '+buffer.display_number});form.append(field('title','标题',buffer.title,'使用具体的模块或操作名称。'),field('body','主说明',buffer.body,'写清触发条件和可见结果；尚未确认的规则注明“待确认”。'),selectControl('说明类型','kind',Object.entries(kinds),buffer.kind));
        if(!allocation)form.append(selectControl('切换说明','edit-switch',notes.annotations.filter(a=>!a.tombstone).map(a=>[a.id,a.display_number+' '+a.title]),buffer.id));
        const contexts=[...new Map([...notes.annotations.map(a=>a.page_or_state_context),buffer.page_or_state_context,currentContext().context,{id:'prototype',title:'全原型',entry_steps:[]}].map(c=>[c.id,c])).values()];form.append(selectControl('页面或状态','context',contexts.map(c=>[c.id,c.title]),buffer.page_or_state_context.id));
        if(buffer.anchor){form.append(make('p','区域：'+(buffer.anchor.fingerprint.semantic_name||buffer.anchor.locator),{class:'hint'}),button('重选区域','rebind',null,'secondary-button'));}
        const templates=make('details',null,{class:'form-options'});templates.append(make('summary','按场景填写提示'));for(let i=0;i<templatePrompts.length;i++)templates.append(button(templatePrompts[i][0],'template',String(i),'quiet-button'));form.append(templates);
        const optional=make('details',null,{class:'form-options'});optional.append(make('summary','补充适用细节'));for(const[k,label]of Object.entries(detailLabels))optional.append(field('details.'+k,label,buffer.details[k]||'',k==='visual'?'仅有据且确需随可用宽高变化的大模块说明布局与适配；小控件归父模块，不猜尺寸或断点。':'只填写这条规则实际适用的内容，可以留空。'));form.append(optional);content.append(form);}
      else if(state==='COMPARE_FIELD'){const a=notes.annotations.find(a=>a.id===selected);if(a){content.append(make('h3','说明 '+a.display_number+' 的更新建议',{'data-compare-heading':'true',tabindex:'-1',class:'compare-heading'}));const fields=Object.entries(a.field_origins).filter(([,o])=>o.suggestion_meta);for(const[p,o]of fields){const block=make('section',null,{class:'compare','data-compare':p});const current=p.startsWith('details.')?a.details[p.slice(8)]:a[p];block.append(make('h3',p==='body'?'主说明':p==='title'?'标题':detailLabels[p.slice(8)]),make('small','当前文字'),make('p',current||'（未填写）'),make('small','AI 更新建议'),make('p',o.suggested_value||'（建议移除此字段）'));const basis=make('div',null,{class:'suggestion-basis'});basis.append(make('small','建议依据'));for(const id of o.suggestion_meta.source_refs){const ref=bundle.sources.find(s=>s.id===id);basis.append(make('p',ref?ref.title+' · '+ref.kind+' · '+ref.locator:'来源不可用'));}if(!o.suggestion_meta.source_refs.length)basis.append(make('p','无可追溯来源'));basis.append(make('small',{confirmed:'已确认依据',observed:'原型观察依据',proposed:'待确认建议'}[o.suggestion_meta.evidence_status]));block.append(basis);const stale=o.suggestion_meta.base_revision!==notes.base_revision||o.suggestion_meta.binding_revision!==a.binding_revision;const keep=button('保留此字段','keep',p,'secondary-button'),adopt=button('采用此字段','adopt',p,'primary-button');keep.disabled=adopt.disabled=stale;block.append(keep,adopt);content.append(block);}if(!fields.length)content.append(make('p','该条建议已处理。',{class:'empty'}));content.append(button('返回说明','compare-back',null,'secondary-button'));}}
      if(['VIEW','EDIT_LIST'].includes(state)){
        const list=make('div',null,{class:'list'});
        if(!rows.length)list.append(make('p','这里还没有说明。',{class:'empty'}));
        for(const a of rows){
          const chosen=selected===a.id,card=make('article',null,{'data-card':a.id,class:'note-row'+(chosen?' selected':'')}),head=make('div',null,{class:'row-header'}),select=button('','select',a.id,'row-select');
          select.setAttribute('aria-label',a.display_number+' '+a.title);select.setAttribute('aria-pressed',String(chosen));select.append(make('span',String(a.display_number),{class:'note-number'}),make('span',a.title,{class:'note-title'}));
          const edit=button('编辑','edit',a.id,'row-edit');edit.setAttribute('aria-label','编辑 '+a.display_number);edit.disabled=Boolean(unsupported);head.append(select,edit);card.append(head);
          const status=statusNote(a);if(status)card.append(make('p',status,{class:'note-status','aria-label':'说明状态'}));
          card.append(make('p',displayBody(a),{class:'note-body'}));
          for(const[k,v]of Object.entries(a.details))card.append(make('p',detailLabels[k]+'：'+v,{class:'note-detail'}));
          if(chosen){
            if(Object.values(a.field_origins).some(o=>o.suggestion_meta))card.append(button('查看字段更新建议','compare',a.id,'secondary-button'));
            card.append(button('删除说明','delete',a.id,'quiet-button'));
          }
          list.append(card);
        }
        content.append(list);
      }
      const footer=make('footer',null,{class:'panel-footer'});footer.append(make('p',message||(buffer?'编辑中，完成后请下载保存':dirty?'未导出修改':'说明来自当前文件'),{role:'status','aria-live':'polite','data-status':'true',class:'save-status'}));
      if(state==='EDIT_FORM'&&!unsupported){const actions=make('div',null,{class:'edit-actions'});actions.append(button('取消编辑','cancel-edit',null,'secondary-button'),button('完成编辑','save',null,'primary-button'));footer.append(actions);}if(lastDeletedId&&notes.annotations.some(a=>a.id===lastDeletedId&&a.tombstone))footer.append(button('撤销删除','undelete',lastDeletedId,'secondary-button'));if(undoToken)footer.append(button('撤销上一步建议处理','undo',null,'secondary-button'));
      if(['VIEW','EDIT_LIST'].includes(state)){const add=button('新增说明','create-kind',null,'secondary-button');add.disabled=Boolean(unsupported);footer.append(add);}
      const download=button('下载 HTML','download',null,'download '+(buffer?'secondary-button':'primary-button'));download.disabled=Boolean(unsupported||state.startsWith('PICK_')||state==='CREATE_KIND');footer.append(download);panel.append(footer);content.scrollTop=scroll;refresh();if(remember){const restored=remember.field?shadow.querySelector('[data-field="'+remember.field+'"]'):remember.control?shadow.querySelector('[data-control="'+remember.control+'"]'):remember.treeSearch?shadow.querySelector('[data-tree-search]'):remember.command?[...shadow.querySelectorAll('[data-command]')].find(el=>el.dataset.command===remember.command&&el.dataset.id===remember.id):null;if(restored){restored.focus({preventScroll:true});if(remember.range)restored.setSelectionRange(...remember.range);}}
    }
    async function command(cmd,id,keyboard=false){
      if(busy)return;busy=true;try{
        if(cmd==='open'){returnFocus=document.activeElement===host?null:document.activeElement;state=resume;syncModal();observing(true);render();focus('close');}
        else if(cmd==='close'){resume=state.startsWith('PICK_')?pickerReturn:state;state='CLOSED';hoverTarget=null;observing(false);render();if(returnFocus?.isConnected&&returnFocus.tabIndex>=0&&visible(returnFocus))returnFocus.focus({preventScroll:true});else focus('open');}
        else if(cmd==='side'){side=side==='right'?'left':'right';render();focus('side');}
        else if(cmd==='collapse'){collapsed=!collapsed;observing(!collapsed);render();focus('collapse');}
        else if(cmd==='create-kind'){if(buffer&&!await save())return;state='CREATE_KIND';render();focus('new-region');}
        else if(cmd==='cancel-create'){state='EDIT_LIST';render();focus('create-kind');}
        else if(cmd==='new-region')startPick(false,keyboard);
        else if(cmd==='new-rule')await newDraft();
        else if(cmd==='rebind')startPick(true,keyboard);
        else if(cmd==='pick-mode'){state=state==='PICK_POINTER'?'PICK_TREE':'PICK_POINTER';tree=candidates();treeSelected=tree[0]||null;render();if(state==='PICK_TREE')shadow.querySelector('[data-tree-search]')?.focus();else focus('cancel-pick');}
        else if(cmd==='cancel-pick'){state=pickerReturn;hoverTarget=null;rebindId=null;message='已取消选区';render();focus(buffer?'rebind':'create-kind');}
        else if(cmd==='tree-select'){treeSelected=tree[Number(id)];hoverTarget=treeSelected;render();shadow.querySelector('[data-command="tree-select"][data-id="'+id+'"]')?.focus({preventScroll:true});}
        else if(cmd==='confirm-tree')await confirmTarget(treeSelected);
        else if(cmd==='edit'&&!unsupported)await beginEdit(notes.annotations.find(a=>a.id===id));
        else if(cmd==='cancel-edit'){const cancelled=buffer?.id;if(allocation)await transaction({action:'cancel-reservation',allocation});buffer=null;allocation=null;fieldErrors={};state='EDIT_LIST';message='已取消本次编辑';render();const edit=shadow.querySelector('[data-command="edit"][data-id="'+cancelled+'"]');if(edit)edit.focus();else focus('create-kind');}
        else if(cmd==='save'){if(await save()){render();focusCard();}}
        else if(cmd==='delete'||cmd==='undelete'){const r=await transaction({action:cmd,annotation_id:id});if(r){if(cmd==='delete')lastDeletedId=id;else{if(lastDeletedId===id)lastDeletedId=null;selected=id;}message=cmd==='delete'?'已删除，可撤销':'已恢复';}render();if(r){if(cmd==='delete')focus('undelete');else focusCard();}}
        else if(cmd==='cluster'){expandedCluster=expandedCluster===id?null:id;refresh();}
        else if(cmd==='select'){selected=id;expandedCluster=null;const a=notes.annotations.find(a=>a.id===id),target=locate(a);if(target)target.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});render();shadow.querySelector('[data-card="'+id+'"]')?.scrollIntoView({block:'nearest'});shadow.querySelector('[data-card="'+id+'"] [data-command="select"]')?.focus({preventScroll:true});}
        else if(cmd==='compare'){selected=id;state='COMPARE_FIELD';render();shadow.querySelector('[data-compare-heading]')?.focus({preventScroll:true});}
        else if(cmd==='keep'||cmd==='adopt'){const r=await transaction({action:cmd,annotation_id:selected,field_path:id});render();if(r)focusComparison();}
        else if(cmd==='undo'){const r=await transaction({action:'undo',undo_token:undoToken});if(r)undoToken=null;render();if(r&&state==='COMPARE_FIELD')focusComparison();}
        else if(cmd==='defer'){await transaction({action:'defer'});state='EDIT_LIST';message='建议暂缓，内容和处理历史已保留。';render();focusCard();}
        else if(cmd==='compare-back'){state='EDIT_LIST';render();focusCard();}
        else if(cmd==='template'){message=templatePrompts[Number(id)][1];const status=shadow.querySelector('[data-status]');if(status)status.textContent=message;}
        else if(cmd==='download'&&!unsupported){if(!await save())return;const result=await core.assemble({...bundle,notes});if(!result.ok)message=result.message;else{const url=URL.createObjectURL(new Blob([result.value.html],{type:'text/html;charset=utf-8'})),a=make('a',null,{href:url,download:'prototype-with-notes.html'});shadow.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);dirty=false;message='已发起下载';}render();}
      }finally{busy=false;}
    }
    function pickEvent(e){if(e.type==='keydown'&&e.key==='Escape'&&!e.isComposing&&!composing){command('cancel-pick');return;}if(!['click','pointermove'].includes(e.type))return;const overlay=shadow.querySelector('.picker');if(overlay)overlay.hidden=true;const all=candidates(),raw=document.elementsFromPoint(e.clientX,e.clientY).find(el=>all.includes(normalizeCandidate(el))),target=raw&&normalizeCandidate(raw);if(overlay)overlay.hidden=false;if(e.type==='pointermove'){hoverTarget=target||null;refresh(true);}else{busy=true;confirmTarget(target).finally(()=>busy=false);}}
    function treeKey(e,path){if(state!=='PICK_TREE'||path.some(n=>n?.dataset?.treeSearch))return false;const current=treeSelected,all=tree.filter(el=>visible(el)&&(!search||normalize((name(el)||'')+' '+el.tagName).toLowerCase().includes(search.toLowerCase())));let next;
      if(e.key==='Enter'){e.preventDefault();busy=true;confirmTarget(current).finally(()=>busy=false);return true;}
      const parent=all.findLast(p=>p!==current&&p.contains(current));if(e.key==='ArrowLeft')next=parent;else if(e.key==='ArrowRight')next=all.find(c=>c!==current&&current?.contains(c));else if(e.key==='ArrowUp'||e.key==='ArrowDown'){const siblings=all.filter(c=>all.findLast(p=>p!==c&&p.contains(c))===parent),at=siblings.indexOf(current);next=siblings[at+(e.key==='ArrowDown'?1:-1)]||current;}else return false;
      e.preventDefault();if(next){treeSelected=next;hoverTarget=next;render();shadow.querySelector('[data-command="tree-select"][data-id="'+tree.indexOf(next)+'"]')?.focus({preventScroll:true});}return true;
    }
    controller={host,shadow,clearBusinessEvent(){lastEntryTrigger=null;},businessEvent(e,path){if(state==='CLOSED'||!e.isTrusted||e.type!=='click')return;const trigger=path.find(n=>n instanceof Element&&n.matches('button,a,[role=button]'));if(trigger&&visible(trigger))lastEntryTrigger=(name(trigger)||'').slice(0,200);},get picking(){return state==='PICK_POINTER';},syncModal,pickEvent,toolEvent(e,path){
      if(e.type==='compositionstart')composing=true;if(e.type==='compositionend'||e.type==='blur')composing=false;
      if((e.type==='input'||e.type==='compositionend')&&buffer){const el=path.find(n=>n?.dataset?.field);if(el){const key=el.dataset.field;if(key.startsWith('details.')){if(el.value)buffer.details[key.slice(8)]=el.value;else delete buffer.details[key.slice(8)];}else buffer[key]=el.value;delete fieldErrors[key];el.removeAttribute('aria-invalid');const error=shadow.getElementById('pn-'+key+'-error');if(error){error.textContent='';error.hidden=true;}message='编辑中，完成后请下载保存';const status=shadow.querySelector('[data-status]');if(status)status.textContent=message;}}
      if((e.type==='input'||e.type==='compositionend')&&path.some(n=>n?.dataset?.treeSearch)){const input=path.find(n=>n?.dataset?.treeSearch),range=[input.selectionStart,input.selectionEnd];search=input.value;if(composing||e.isComposing)return;treeSelected=tree.find(el=>visible(el)&&normalize((name(el)||'')+' '+el.tagName).toLowerCase().includes(search.toLowerCase()))||null;hoverTarget=treeSelected;render();const next=shadow.querySelector('[data-tree-search]');next.focus();next.setSelectionRange(...range);}
      if(e.type==='change'){const el=path.find(n=>n?.dataset?.control);if(el){if(el.dataset.control==='edit-switch')command('edit',el.value);else if(buffer&&el.dataset.control==='kind')buffer.kind=el.value;else if(buffer&&el.dataset.control==='context'){const found=notes.annotations.map(a=>a.page_or_state_context).concat(currentContext().context,{id:'prototype',title:'全原型',entry_steps:[]}).find(c=>c.id===el.value);if(found&&found.id!==buffer.page_or_state_context.id){buffer.page_or_state_context=core.clone(found);if(allocation){buffer.binding_revision++;if(buffer.anchor){buffer.anchor.context_id=found.id;buffer.anchor.requires_rebind=true;}}render();}}}}
      if(e.type==='keydown'&&!e.isComposing&&e.keyCode!==229&&!composing){if(e.key==='Escape'){e.preventDefault();command(state.startsWith('PICK_')?'cancel-pick':({EDIT_FORM:'cancel-edit',CREATE_KIND:'cancel-create',COMPARE_FIELD:'compare-back'}[state]||'close'));return;}if(treeKey(e,path))return;if(e.key==='Tab'&&innerWidth<640){const els=[...shadow.querySelectorAll('.panel button:not(:disabled),.panel input,.panel textarea,.panel select,.panel summary')].filter(el=>el.offsetParent!==null),at=els.indexOf(shadow.activeElement);if(!e.shiftKey&&at===els.length-1||e.shiftKey&&at===0){e.preventDefault();els[e.shiftKey?els.length-1:0]?.focus();}}}
      if(e.type==='click'){const control=path.find(n=>n?.dataset?.command);if(control&&!control.disabled)command(control.dataset.command,control.dataset.id,e.detail===0);}
    }};
    document.body.append(host);if(typeof host.showPopover==='function')host.showPopover();syncModal();render();
  },{once:true});
}
