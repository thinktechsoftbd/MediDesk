import { db } from "@/lib/prisma";
import { bad, requireSession } from "@/lib/api";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles=StyleSheet.create({page:{padding:35,fontSize:11},title:{fontSize:20,marginBottom:8},sub:{fontSize:10,color:"#64748b",marginBottom:16},row:{flexDirection:"row",borderBottom:"1 solid #ddd",paddingVertical:7},cell:{flex:1}});
export async function GET(_:Request,{params}:{params:{id:string}}){
  if(!await requireSession())return bad("Unauthorized",401);
  const p=await db.prescription.findUnique({where:{id:Number(params.id)},include:{patient:true,caseHistory:true,items:{include:{medicine:true}}}});
  if(!p)return bad("Prescription not found",404);
  const doc=<Document><Page size="A4" style={styles.page}><Text style={styles.title}>Mohonto Dental Care</Text><Text style={styles.sub}>Dental Prescription · {p.prescriptionNo}</Text><Text>Patient: {p.patient.name}</Text><Text>Phone: {p.patient.phone}</Text><Text>Case: {String(p.caseHistory.caseNo).padStart(2,"0")}</Text><Text>Diagnosis: {p.diagnosis||"—"}</Text><View style={{marginTop:20}}>{p.items.map((m: any)=><View style={styles.row} key={m.id}><Text style={styles.cell}>{m.medicine.name}{m.medicine.strength?` ${m.medicine.strength} ${m.medicine.unit||""}`:""}{m.medicine.dosageForm?` (${m.medicine.dosageForm})`:""}</Text><Text style={styles.cell}>{m.dosage}</Text><Text style={styles.cell}>{m.duration}</Text><Text style={styles.cell}>{m.instructions||""}</Text></View>)}</View><Text style={{marginTop:30}}>Doctor: __________________________</Text></Page></Document>;
  const buffer=await renderToBuffer(doc);
  return new Response(buffer as any,{headers:{"Content-Type":"application/pdf","Content-Disposition":`inline; filename="${p.prescriptionNo}.pdf"`}});
}
