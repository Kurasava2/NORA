
      const enc=new TextEncoder();
      const XML='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
      function xe(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')}
        function colName(n){let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s}
        function cell(addr,value,style=0){
          if(value===null||value===undefined||value==='') return `<c r="${addr}" s="${style}"/>`;
          if(typeof value==='number'&&Number.isFinite(value))return `<c r="${addr}" s="${style}" t="n"><v>${value}</v></c>`;
          if(typeof value==='boolean')return `<c r="${addr}" s="${style}" t="b"><v>${value?1:0}</v></c>`;
          return `<c r="${addr}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xe(value)}</t></is></c>`;
        }
        function rowXml(r,values,styles,height){
          const attrs=`r="${r}"${height?` ht="${height}" customHeight="1"`:''}`;
          const cells=values.map((v,i)=>cell(`${colName(i+1)}${r}`,v,Array.isArray(styles)?(styles[i]??0):(styles??0))).join('');
          return `<row ${attrs}>${cells}</row>`;
        }
        function sheetXml(model){
          const widths=model.widths||[7.28515625,11.7109375,11.140625,12,11.140625,16.42578125,14.140625,18,15.42578125,12.7109375,17.28515625];
          let r=1,rows=[],merges=[];
          rows.push(rowXml(r,[model.title,...Array(10).fill('')],[1,...Array(10).fill(0)],36.75));merges.push(`A${r}:K${r}`);r++;
          rows.push(rowXml(r,[model.norm,...Array(10).fill('')],[2,...Array(10).fill(0)],83.25));merges.push(`A${r}:K${r}`);r++;
          rows.push(rowXml(r,Array(11).fill(''),0,9));r++;
          rows.push(rowXml(r,model.headers,Array(11).fill(3),66));r++;
          for(const rr of model.tripRows||[])rows.push(rowXml(r++,rr,[4,4,4,4,4,4,4,4,4,4,5],108.75));
          rows.push(rowXml(r++,model.totalRow,[4,6,4,6,6,4,4,4,4,6,4],48.75));
          for(const rr of model.materialRows||[])rows.push(rowXml(r++,rr,[4,4,4,7,4,6,6,6,6,4,4],48.75));
          rows.push(rowXml(r,Array(11).fill(''),0,14.25));r++;
          for(const line of model.noteLines||[]){rows.push(rowXml(r,[line,...Array(10).fill('')],[8,...Array(10).fill(0)],28));merges.push(`A${r}:K${r}`);r++}
          if(model.signTitle){rows.push(rowXml(r,[model.signTitle,...Array(10).fill('')],[9,...Array(10).fill(0)],22));merges.push(`A${r}:K${r}`);r++}
          if(model.signLine){
            const s=model.signLine,signature=`${s.rank||''}__________${s.commander||''}`;
            rows.push(rowXml(r,[signature,...Array(10).fill('')],[9,...Array(10).fill(0)],28));
            merges.push(`A${r}:K${r}`);r++;
          }
          const cols=widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('');
          const mergeXml=merges.length?`<mergeCells count="${merges.length}">${merges.map(x=>`<mergeCell ref="${x}"/>`).join('')}</mergeCells>`:'';
          return XML+`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:K${Math.max(1,r-1)}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>${rows.join('')}</sheetData>${mergeXml}<printOptions horizontalCentered="1"/><pageMargins left="0.25" right="0.25" top="0.75" bottom="0.75" header="0.3" footer="0.3"/><pageSetup paperSize="9" scale="67" orientation="portrait" fitToHeight="0"/></worksheet>`;
        }
        function stylesXml(){return XML+`<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
          <numFmts count="0"/>
          <fonts count="5">
          <font><sz val="11"/><name val="Times New Roman"/></font>
          <font><b/><sz val="12"/><name val="Times New Roman"/></font>
          <font><b/><sz val="11"/><name val="Times New Roman"/></font>
          <font><sz val="10"/><name val="Times New Roman"/></font>
          <font><sz val="12"/><name val="Times New Roman"/></font>
          </fonts>
          <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
          <borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color auto="1"/></left><right style="thin"><color auto="1"/></right><top style="thin"><color auto="1"/></top><bottom style="thin"><color auto="1"/></bottom><diagonal/></border></borders>
          <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
          <cellXfs count="10">
          <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
          <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
          <xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
          <xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
          <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
          <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
          <xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
          <xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
          <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
          <xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
          </cellXfs>
          <cellStyles count="1"><cellStyle name="Обычный" xfId="0" builtinId="0"/></cellStyles>
        </styleSheet>`}
        function workbookXml(models){return XML+`<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000"/></bookViews><sheets>${models.map((m,i)=>`<sheet name="${xe(safeSheetName(m.name,i+1))}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets><calcPr calcId="0" fullCalcOnLoad="1"/></workbook>`}
        function workbookRels(models){const sheets=models.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('');return XML+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets}<Relationship Id="rId${models.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`}
        function contentTypes(models){return XML+`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${models.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`}
        function rootRels(){return XML+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`}
        function coreXml(){const d=new Date().toISOString();return XML+`<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>ГСМ · Ведомости</dc:creator><cp:lastModifiedBy>ГСМ · Ведомости</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${d}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${d}</dcterms:modified></cp:coreProperties>`}
        function appXml(models){return XML+`<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>ГСМ · Ведомости</Application><TitlesOfParts><vt:vector size="${models.length}" baseType="lpstr">${models.map((m,i)=>`<vt:lpstr>${xe(safeSheetName(m.name,i+1))}</vt:lpstr>`).join('')}</vt:vector></TitlesOfParts></Properties>`}
        function safeSheetName(name,i){let s=String(name||`Ведомость ${i}`).replace(/[\\\/?*\[\]:]/g,' ').trim();return (s||`Ведомость ${i}`).slice(0,31)}
        const crcTable=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);t[n]=c>>>0}return t})();
        function crc32(bytes){let c=0xffffffff;for(let i=0;i<bytes.length;i++)c=crcTable[(c^bytes[i])&255]^(c>>>8);return (c^0xffffffff)>>>0}
        function u16(n){return Uint8Array.of(n&255,(n>>>8)&255)}function u32(n){return Uint8Array.of(n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255)}
        function cat(...arrs){let len=arrs.reduce((s,a)=>s+a.length,0),o=new Uint8Array(len),p=0;for(const a of arrs){o.set(a,p);p+=a.length}return o}
        function dosDT(d=new Date()){let year=Math.max(1980,d.getFullYear())-1980;return {time:((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1))&0xffff,date:((year<<9)|((d.getMonth()+1)<<5)|d.getDate())&0xffff}}
        function zip(files){let locals=[],centrals=[],offset=0;const dt=dosDT();for(const f of files){const name=enc.encode(f.name),data=f.data instanceof Uint8Array?f.data:enc.encode(f.data),crc=crc32(data);const local=cat(u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(dt.time),u16(dt.date),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data);locals.push(local);const central=cat(u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(dt.time),u16(dt.date),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name);centrals.push(central);offset+=local.length}const centralSize=centrals.reduce((s,a)=>s+a.length,0);const end=cat(u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(centralSize),u32(offset),u16(0));return cat(...locals,...centrals,end)}
        function build(models){if(!models?.length)throw new Error('Нет ведомостей для экспорта');const files=[{name:'[Content_Types].xml',data:contentTypes(models)},{name:'_rels/.rels',data:rootRels()},{name:'xl/workbook.xml',data:workbookXml(models)},{name:'xl/_rels/workbook.xml.rels',data:workbookRels(models)},{name:'xl/styles.xml',data:stylesXml()},{name:'docProps/core.xml',data:coreXml()},{name:'docProps/app.xml',data:appXml(models)}];models.forEach((m,i)=>files.push({name:`xl/worksheets/sheet${i+1}.xml`,data:sheetXml(m)}));return zip(files)}
        function download(models,filename){const bytes=build(models),blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename||'Ведомость.xlsx';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);return bytes}
        
export { zip };
