// Lean compiler output
// Module: Algal.Admission.Model
// Imports: public import Init public meta import Init public import Algal.Memory.Datalog
#include <lean/lean.h>
#if defined(__clang__)
#pragma clang diagnostic ignored "-Wunused-parameter"
#pragma clang diagnostic ignored "-Wunused-label"
#elif defined(__GNUC__) && !defined(__CLANG__)
#pragma GCC diagnostic ignored "-Wunused-parameter"
#pragma GCC diagnostic ignored "-Wunused-label"
#pragma GCC diagnostic ignored "-Wunused-but-set-variable"
#endif
#ifdef __cplusplus
extern "C" {
#endif
lean_object* lp_algalVerification_Algal_Memory_litVars(lean_object*);
lean_object* lp_algalVerification_Algal_Memory_bodyVars(lean_object*);
uint8_t lean_string_dec_eq(lean_object*, lean_object*);
uint8_t lp_algalVerification_Algal_Memory_valid(lean_object*, lean_object*, lean_object*);
lean_object* l_List_get_x3fInternal___redArg(lean_object*, lean_object*);
uint8_t lp_algalVerification_Algal_Memory_instDecidableEqTuple_decEq(lean_object*, lean_object*);
lean_object* lp_algalVerification_Algal_Memory_instDecidableEqFact___boxed(lean_object*, lean_object*);
uint8_t l_instDecidableEqList___redArg(lean_object*, lean_object*, lean_object*);
lean_object* lp_algalVerification_Algal_Memory_instDecidableEqRule___boxed(lean_object*, lean_object*);
lean_object* lean_mk_empty_array_with_capacity(lean_object*);
lean_object* lean_array_to_list(lean_object*);
lean_object* lean_array_push(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_List_elem___at___00Algal_Admission_progSafe_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_elem___at___00Algal_Admission_progSafe_spec__0___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Admission_progSafe_spec__1(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Admission_progSafe_spec__1___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Admission_progSafe_spec__2(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Admission_progSafe_spec__2___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Admission_progSafe(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Admission_progSafe___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Admission_admit___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Admission_admit___redArg___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Admission_admit(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Admission_admit___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Admission_Model_0__Algal_Admission_admit_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Admission_Model_0__Algal_Admission_admit_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_filterMapTR_go___at___00Algal_Admission_usedPremises_spec__0(lean_object*, lean_object*);
static const lean_array_object lp_algalVerification_Algal_Admission_usedPremises___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_array_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 246}, .m_size = 0, .m_capacity = 0, .m_data = {}};
static const lean_object* lp_algalVerification_Algal_Admission_usedPremises___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Admission_usedPremises___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Admission_usedPremises(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Admission_Model_0__Algal_Admission_usedPremises_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Admission_Model_0__Algal_Admission_usedPremises_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Admission_Model_0__Algal_Memory_premisesOK_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Admission_Model_0__Algal_Memory_premisesOK_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_List_elem___at___00Algal_Admission_progSafe_spec__0(lean_object* v_a_1_, lean_object* v_x_2_){
_start:
{
if (lean_obj_tag(v_x_2_) == 0)
{
uint8_t v___x_3_; 
v___x_3_ = 0;
return v___x_3_;
}
else
{
lean_object* v_head_4_; lean_object* v_tail_5_; uint8_t v___x_6_; 
v_head_4_ = lean_ctor_get(v_x_2_, 0);
v_tail_5_ = lean_ctor_get(v_x_2_, 1);
v___x_6_ = lean_string_dec_eq(v_a_1_, v_head_4_);
if (v___x_6_ == 0)
{
v_x_2_ = v_tail_5_;
goto _start;
}
else
{
return v___x_6_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_elem___at___00Algal_Admission_progSafe_spec__0___boxed(lean_object* v_a_8_, lean_object* v_x_9_){
_start:
{
uint8_t v_res_10_; lean_object* v_r_11_; 
v_res_10_ = lp_algalVerification_List_elem___at___00Algal_Admission_progSafe_spec__0(v_a_8_, v_x_9_);
lean_dec(v_x_9_);
lean_dec_ref(v_a_8_);
v_r_11_ = lean_box(v_res_10_);
return v_r_11_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Admission_progSafe_spec__1(lean_object* v_r_12_, lean_object* v_x_13_){
_start:
{
if (lean_obj_tag(v_x_13_) == 0)
{
uint8_t v___x_14_; 
v___x_14_ = 1;
return v___x_14_;
}
else
{
lean_object* v_head_15_; lean_object* v_tail_16_; lean_object* v___x_17_; uint8_t v___x_18_; 
v_head_15_ = lean_ctor_get(v_x_13_, 0);
v_tail_16_ = lean_ctor_get(v_x_13_, 1);
v___x_17_ = lp_algalVerification_Algal_Memory_bodyVars(v_r_12_);
v___x_18_ = lp_algalVerification_List_elem___at___00Algal_Admission_progSafe_spec__0(v_head_15_, v___x_17_);
lean_dec(v___x_17_);
if (v___x_18_ == 0)
{
return v___x_18_;
}
else
{
v_x_13_ = v_tail_16_;
goto _start;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Admission_progSafe_spec__1___boxed(lean_object* v_r_20_, lean_object* v_x_21_){
_start:
{
uint8_t v_res_22_; lean_object* v_r_23_; 
v_res_22_ = lp_algalVerification_List_all___at___00Algal_Admission_progSafe_spec__1(v_r_20_, v_x_21_);
lean_dec(v_x_21_);
lean_dec_ref(v_r_20_);
v_r_23_ = lean_box(v_res_22_);
return v_r_23_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Admission_progSafe_spec__2(lean_object* v_x_24_){
_start:
{
if (lean_obj_tag(v_x_24_) == 0)
{
uint8_t v___x_25_; 
v___x_25_ = 1;
return v___x_25_;
}
else
{
lean_object* v_head_26_; lean_object* v_tail_27_; lean_object* v_head_28_; lean_object* v___x_29_; uint8_t v___x_30_; 
v_head_26_ = lean_ctor_get(v_x_24_, 0);
v_tail_27_ = lean_ctor_get(v_x_24_, 1);
v_head_28_ = lean_ctor_get(v_head_26_, 1);
v___x_29_ = lp_algalVerification_Algal_Memory_litVars(v_head_28_);
v___x_30_ = lp_algalVerification_List_all___at___00Algal_Admission_progSafe_spec__1(v_head_26_, v___x_29_);
lean_dec(v___x_29_);
if (v___x_30_ == 0)
{
return v___x_30_;
}
else
{
v_x_24_ = v_tail_27_;
goto _start;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Admission_progSafe_spec__2___boxed(lean_object* v_x_32_){
_start:
{
uint8_t v_res_33_; lean_object* v_r_34_; 
v_res_33_ = lp_algalVerification_List_all___at___00Algal_Admission_progSafe_spec__2(v_x_32_);
lean_dec(v_x_32_);
v_r_34_ = lean_box(v_res_33_);
return v_r_34_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Admission_progSafe(lean_object* v_rs_35_){
_start:
{
uint8_t v___x_36_; 
v___x_36_ = lp_algalVerification_List_all___at___00Algal_Admission_progSafe_spec__2(v_rs_35_);
return v___x_36_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Admission_progSafe___boxed(lean_object* v_rs_37_){
_start:
{
uint8_t v_res_38_; lean_object* v_r_39_; 
v_res_38_ = lp_algalVerification_Algal_Admission_progSafe(v_rs_37_);
lean_dec(v_rs_37_);
v_r_39_ = lean_box(v_res_38_);
return v_r_39_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Admission_admit___redArg(lean_object* v_inst_40_, lean_object* v_inst_41_, lean_object* v_ctx_42_, lean_object* v_c_43_){
_start:
{
lean_object* v_binds_44_; lean_object* v_derivation_45_; lean_object* v_answer_46_; lean_object* v_witness_47_; lean_object* v_snapshot_48_; lean_object* v_rules_49_; lean_object* v_host_50_; lean_object* v_engine_51_; lean_object* v_snapshot_52_; lean_object* v_rules_53_; lean_object* v_host_54_; lean_object* v_engine_55_; uint8_t v___y_57_; lean_object* v___x_71_; uint8_t v___x_72_; 
v_binds_44_ = lean_ctor_get(v_c_43_, 0);
lean_inc_ref(v_binds_44_);
v_derivation_45_ = lean_ctor_get(v_c_43_, 1);
lean_inc(v_derivation_45_);
v_answer_46_ = lean_ctor_get(v_c_43_, 2);
lean_inc_ref(v_answer_46_);
v_witness_47_ = lean_ctor_get(v_c_43_, 3);
lean_inc(v_witness_47_);
lean_dec_ref(v_c_43_);
v_snapshot_48_ = lean_ctor_get(v_binds_44_, 0);
lean_inc_n(v_snapshot_48_, 2);
v_rules_49_ = lean_ctor_get(v_binds_44_, 1);
lean_inc(v_rules_49_);
v_host_50_ = lean_ctor_get(v_binds_44_, 2);
lean_inc(v_host_50_);
v_engine_51_ = lean_ctor_get(v_binds_44_, 3);
lean_inc(v_engine_51_);
lean_dec_ref(v_binds_44_);
v_snapshot_52_ = lean_ctor_get(v_ctx_42_, 0);
lean_inc(v_snapshot_52_);
v_rules_53_ = lean_ctor_get(v_ctx_42_, 1);
lean_inc(v_rules_53_);
v_host_54_ = lean_ctor_get(v_ctx_42_, 2);
lean_inc(v_host_54_);
v_engine_55_ = lean_ctor_get(v_ctx_42_, 3);
lean_inc(v_engine_55_);
lean_dec_ref(v_ctx_42_);
v___x_71_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Memory_instDecidableEqFact___boxed), 2, 0);
v___x_72_ = l_instDecidableEqList___redArg(v___x_71_, v_snapshot_48_, v_snapshot_52_);
if (v___x_72_ == 0)
{
lean_dec(v_rules_53_);
v___y_57_ = v___x_72_;
goto v___jp_56_;
}
else
{
lean_object* v___x_73_; uint8_t v___x_74_; 
v___x_73_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Memory_instDecidableEqRule___boxed), 2, 0);
lean_inc(v_rules_49_);
v___x_74_ = l_instDecidableEqList___redArg(v___x_73_, v_rules_49_, v_rules_53_);
v___y_57_ = v___x_74_;
goto v___jp_56_;
}
v___jp_56_:
{
if (v___y_57_ == 0)
{
lean_dec(v_engine_55_);
lean_dec(v_host_54_);
lean_dec(v_engine_51_);
lean_dec(v_host_50_);
lean_dec(v_rules_49_);
lean_dec(v_snapshot_48_);
lean_dec(v_witness_47_);
lean_dec_ref(v_answer_46_);
lean_dec(v_derivation_45_);
lean_dec_ref(v_inst_41_);
lean_dec_ref(v_inst_40_);
return v___y_57_;
}
else
{
lean_object* v___x_58_; uint8_t v___x_59_; 
v___x_58_ = lean_apply_2(v_inst_40_, v_host_50_, v_host_54_);
v___x_59_ = lean_unbox(v___x_58_);
if (v___x_59_ == 0)
{
uint8_t v___x_60_; 
lean_dec(v_engine_55_);
lean_dec(v_engine_51_);
lean_dec(v_rules_49_);
lean_dec(v_snapshot_48_);
lean_dec(v_witness_47_);
lean_dec_ref(v_answer_46_);
lean_dec(v_derivation_45_);
lean_dec_ref(v_inst_41_);
v___x_60_ = lean_unbox(v___x_58_);
return v___x_60_;
}
else
{
lean_object* v___x_61_; uint8_t v___x_62_; 
v___x_61_ = lean_apply_2(v_inst_41_, v_engine_51_, v_engine_55_);
v___x_62_ = lean_unbox(v___x_61_);
if (v___x_62_ == 0)
{
uint8_t v___x_63_; 
lean_dec(v_rules_49_);
lean_dec(v_snapshot_48_);
lean_dec(v_witness_47_);
lean_dec_ref(v_answer_46_);
lean_dec(v_derivation_45_);
v___x_63_ = lean_unbox(v___x_61_);
return v___x_63_;
}
else
{
uint8_t v___x_64_; 
v___x_64_ = lp_algalVerification_List_all___at___00Algal_Admission_progSafe_spec__2(v_rules_49_);
if (v___x_64_ == 0)
{
lean_dec(v_rules_49_);
lean_dec(v_snapshot_48_);
lean_dec(v_witness_47_);
lean_dec_ref(v_answer_46_);
lean_dec(v_derivation_45_);
return v___x_64_;
}
else
{
uint8_t v___x_65_; 
lean_inc(v_derivation_45_);
v___x_65_ = lp_algalVerification_Algal_Memory_valid(v_rules_49_, v_snapshot_48_, v_derivation_45_);
if (v___x_65_ == 0)
{
lean_dec(v_witness_47_);
lean_dec_ref(v_answer_46_);
lean_dec(v_derivation_45_);
return v___x_65_;
}
else
{
lean_object* v___x_66_; 
v___x_66_ = l_List_get_x3fInternal___redArg(v_derivation_45_, v_witness_47_);
lean_dec(v_derivation_45_);
if (lean_obj_tag(v___x_66_) == 0)
{
uint8_t v___x_67_; 
lean_dec_ref(v_answer_46_);
v___x_67_ = 0;
return v___x_67_;
}
else
{
lean_object* v_val_68_; lean_object* v_conclusion_69_; uint8_t v___x_70_; 
v_val_68_ = lean_ctor_get(v___x_66_, 0);
lean_inc(v_val_68_);
lean_dec_ref_known(v___x_66_, 1);
v_conclusion_69_ = lean_ctor_get(v_val_68_, 1);
lean_inc_ref(v_conclusion_69_);
lean_dec(v_val_68_);
v___x_70_ = lp_algalVerification_Algal_Memory_instDecidableEqTuple_decEq(v_conclusion_69_, v_answer_46_);
return v___x_70_;
}
}
}
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Admission_admit___redArg___boxed(lean_object* v_inst_75_, lean_object* v_inst_76_, lean_object* v_ctx_77_, lean_object* v_c_78_){
_start:
{
uint8_t v_res_79_; lean_object* v_r_80_; 
v_res_79_ = lp_algalVerification_Algal_Admission_admit___redArg(v_inst_75_, v_inst_76_, v_ctx_77_, v_c_78_);
v_r_80_ = lean_box(v_res_79_);
return v_r_80_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Admission_admit(lean_object* v_H_81_, lean_object* v_E_82_, lean_object* v_inst_83_, lean_object* v_inst_84_, lean_object* v_ctx_85_, lean_object* v_c_86_){
_start:
{
uint8_t v___x_87_; 
v___x_87_ = lp_algalVerification_Algal_Admission_admit___redArg(v_inst_83_, v_inst_84_, v_ctx_85_, v_c_86_);
return v___x_87_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Admission_admit___boxed(lean_object* v_H_88_, lean_object* v_E_89_, lean_object* v_inst_90_, lean_object* v_inst_91_, lean_object* v_ctx_92_, lean_object* v_c_93_){
_start:
{
uint8_t v_res_94_; lean_object* v_r_95_; 
v_res_94_ = lp_algalVerification_Algal_Admission_admit(v_H_88_, v_E_89_, v_inst_90_, v_inst_91_, v_ctx_92_, v_c_93_);
v_r_95_ = lean_box(v_res_94_);
return v_r_95_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Admission_Model_0__Algal_Admission_admit_match__1_splitter___redArg(lean_object* v_x_96_, lean_object* v_h__1_97_, lean_object* v_h__2_98_){
_start:
{
if (lean_obj_tag(v_x_96_) == 0)
{
lean_object* v___x_99_; lean_object* v___x_100_; 
lean_dec(v_h__1_97_);
v___x_99_ = lean_box(0);
v___x_100_ = lean_apply_1(v_h__2_98_, v___x_99_);
return v___x_100_;
}
else
{
lean_object* v_val_101_; lean_object* v___x_102_; 
lean_dec(v_h__2_98_);
v_val_101_ = lean_ctor_get(v_x_96_, 0);
lean_inc(v_val_101_);
lean_dec_ref_known(v_x_96_, 1);
v___x_102_ = lean_apply_1(v_h__1_97_, v_val_101_);
return v___x_102_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Admission_Model_0__Algal_Admission_admit_match__1_splitter(lean_object* v_motive_103_, lean_object* v_x_104_, lean_object* v_h__1_105_, lean_object* v_h__2_106_){
_start:
{
if (lean_obj_tag(v_x_104_) == 0)
{
lean_object* v___x_107_; lean_object* v___x_108_; 
lean_dec(v_h__1_105_);
v___x_107_ = lean_box(0);
v___x_108_ = lean_apply_1(v_h__2_106_, v___x_107_);
return v___x_108_;
}
else
{
lean_object* v_val_109_; lean_object* v___x_110_; 
lean_dec(v_h__2_106_);
v_val_109_ = lean_ctor_get(v_x_104_, 0);
lean_inc(v_val_109_);
lean_dec_ref_known(v_x_104_, 1);
v___x_110_ = lean_apply_1(v_h__1_105_, v_val_109_);
return v___x_110_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_filterMapTR_go___at___00Algal_Admission_usedPremises_spec__0(lean_object* v_a_111_, lean_object* v_a_112_){
_start:
{
if (lean_obj_tag(v_a_111_) == 0)
{
lean_object* v___x_113_; 
v___x_113_ = lean_array_to_list(v_a_112_);
return v___x_113_;
}
else
{
lean_object* v_head_114_; lean_object* v_rule_115_; 
v_head_114_ = lean_ctor_get(v_a_111_, 0);
v_rule_115_ = lean_ctor_get(v_head_114_, 0);
if (lean_obj_tag(v_rule_115_) == 0)
{
lean_object* v_tail_116_; lean_object* v_conclusion_117_; lean_object* v___x_118_; 
lean_inc(v_head_114_);
v_tail_116_ = lean_ctor_get(v_a_111_, 1);
lean_inc(v_tail_116_);
lean_dec_ref_known(v_a_111_, 2);
v_conclusion_117_ = lean_ctor_get(v_head_114_, 1);
lean_inc_ref(v_conclusion_117_);
lean_dec(v_head_114_);
v___x_118_ = lean_array_push(v_a_112_, v_conclusion_117_);
v_a_111_ = v_tail_116_;
v_a_112_ = v___x_118_;
goto _start;
}
else
{
lean_object* v_tail_120_; 
v_tail_120_ = lean_ctor_get(v_a_111_, 1);
lean_inc(v_tail_120_);
lean_dec_ref_known(v_a_111_, 2);
v_a_111_ = v_tail_120_;
goto _start;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Admission_usedPremises(lean_object* v_ds_124_){
_start:
{
lean_object* v___x_125_; lean_object* v___x_126_; 
v___x_125_ = ((lean_object*)(lp_algalVerification_Algal_Admission_usedPremises___closed__0));
v___x_126_ = lp_algalVerification_List_filterMapTR_go___at___00Algal_Admission_usedPremises_spec__0(v_ds_124_, v___x_125_);
return v___x_126_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Admission_Model_0__Algal_Admission_usedPremises_match__1_splitter___redArg(lean_object* v_x_127_, lean_object* v_h__1_128_, lean_object* v_h__2_129_){
_start:
{
if (lean_obj_tag(v_x_127_) == 0)
{
lean_object* v___x_130_; lean_object* v___x_131_; 
lean_dec(v_h__2_129_);
v___x_130_ = lean_box(0);
v___x_131_ = lean_apply_1(v_h__1_128_, v___x_130_);
return v___x_131_;
}
else
{
lean_object* v_val_132_; lean_object* v___x_133_; 
lean_dec(v_h__1_128_);
v_val_132_ = lean_ctor_get(v_x_127_, 0);
lean_inc(v_val_132_);
lean_dec_ref_known(v_x_127_, 1);
v___x_133_ = lean_apply_1(v_h__2_129_, v_val_132_);
return v___x_133_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Admission_Model_0__Algal_Admission_usedPremises_match__1_splitter(lean_object* v_motive_134_, lean_object* v_x_135_, lean_object* v_h__1_136_, lean_object* v_h__2_137_){
_start:
{
if (lean_obj_tag(v_x_135_) == 0)
{
lean_object* v___x_138_; lean_object* v___x_139_; 
lean_dec(v_h__2_137_);
v___x_138_ = lean_box(0);
v___x_139_ = lean_apply_1(v_h__1_136_, v___x_138_);
return v___x_139_;
}
else
{
lean_object* v_val_140_; lean_object* v___x_141_; 
lean_dec(v_h__1_136_);
v_val_140_ = lean_ctor_get(v_x_135_, 0);
lean_inc(v_val_140_);
lean_dec_ref_known(v_x_135_, 1);
v___x_141_ = lean_apply_1(v_h__2_137_, v_val_140_);
return v___x_141_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Admission_Model_0__Algal_Memory_premisesOK_match__1_splitter___redArg(lean_object* v_x_142_, lean_object* v_h__1_143_, lean_object* v_h__2_144_){
_start:
{
if (lean_obj_tag(v_x_142_) == 0)
{
lean_object* v___x_145_; lean_object* v___x_146_; 
lean_dec(v_h__1_143_);
v___x_145_ = lean_box(0);
v___x_146_ = lean_apply_1(v_h__2_144_, v___x_145_);
return v___x_146_;
}
else
{
lean_object* v_val_147_; lean_object* v___x_148_; 
lean_dec(v_h__2_144_);
v_val_147_ = lean_ctor_get(v_x_142_, 0);
lean_inc(v_val_147_);
lean_dec_ref_known(v_x_142_, 1);
v___x_148_ = lean_apply_1(v_h__1_143_, v_val_147_);
return v___x_148_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Admission_Model_0__Algal_Memory_premisesOK_match__1_splitter(lean_object* v_motive_149_, lean_object* v_x_150_, lean_object* v_h__1_151_, lean_object* v_h__2_152_){
_start:
{
if (lean_obj_tag(v_x_150_) == 0)
{
lean_object* v___x_153_; lean_object* v___x_154_; 
lean_dec(v_h__1_151_);
v___x_153_ = lean_box(0);
v___x_154_ = lean_apply_1(v_h__2_152_, v___x_153_);
return v___x_154_;
}
else
{
lean_object* v_val_155_; lean_object* v___x_156_; 
lean_dec(v_h__2_152_);
v_val_155_ = lean_ctor_get(v_x_150_, 0);
lean_inc(v_val_155_);
lean_dec_ref_known(v_x_150_, 1);
v___x_156_ = lean_apply_1(v_h__1_151_, v_val_155_);
return v___x_156_;
}
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Memory_Datalog(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Admission_Model(uint8_t builtin) {
lean_object * res;
if (_G_initialized) return lean_io_result_mk_ok(lean_box(0));
_G_initialized = true;
lean_initialize_runtime_module();
res = initialize_Init(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_Init(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Memory_Datalog(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
