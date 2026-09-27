// Lean compiler output
// Module: Algal.Core.Accounting
// Imports: public import Init public meta import Init public import Algal.Core.Binary64
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
lean_object* lean_nat_add(lean_object*, lean_object*);
uint8_t lean_nat_dec_le(lean_object*, lean_object*);
uint8_t lean_nat_dec_lt(lean_object*, lean_object*);
lean_object* lean_nat_to_int(lean_object*);
uint8_t lean_int_dec_le(lean_object*, lean_object*);
lean_object* l_Int_toNat(lean_object*);
uint8_t lean_nat_dec_eq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_maximumExactInteger;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Accounting_instDecidableEqCost_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_instDecidableEqCost_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Accounting_instDecidableEqCost(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_instDecidableEqCost___boxed(lean_object*, lean_object*);
static lean_once_cell_t lp_algalVerification_Algal_Core_Accounting_admitCost___closed__0_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_Accounting_admitCost___closed__0;
static lean_once_cell_t lp_algalVerification_Algal_Core_Accounting_admitCost___closed__1_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_Accounting_admitCost___closed__1;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_admitCost(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_admitCost___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_BudgetError_ofNat(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_BudgetError_ofNat___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Accounting_instDecidableEqBudgetError(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_instDecidableEqBudgetError___boxed(lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Core_Accounting_preIncrement___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 0}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_Accounting_preIncrement___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_Accounting_preIncrement___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_preIncrement(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_preIncrement___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Accounting_instDecidableEqChargeResult_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_instDecidableEqChargeResult_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Accounting_instDecidableEqChargeResult(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_instDecidableEqChargeResult___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_postCharge(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_postCharge___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_activationCharge;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_effectBaseCharge;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_chargeBeforeResult___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_chargeBeforeResult___redArg___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_chargeBeforeResult(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_chargeBeforeResult___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_directToolResultCharge___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_directToolResultCharge___redArg___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_directToolResultCharge(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_directToolResultCharge___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_effectAttemptCharge(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_effectAttemptCharge___boxed(lean_object*);
static lean_object* _init_lp_algalVerification_Algal_Core_Accounting_maximumExactInteger(void){
_start:
{
lean_object* v___x_1_; 
v___x_1_ = lean_cstr_to_nat("9007199254740991");
return v___x_1_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Accounting_instDecidableEqCost_decEq(lean_object* v_x_2_, lean_object* v_x_3_){
_start:
{
uint8_t v___x_4_; 
v___x_4_ = lean_nat_dec_eq(v_x_2_, v_x_3_);
return v___x_4_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_instDecidableEqCost_decEq___boxed(lean_object* v_x_5_, lean_object* v_x_6_){
_start:
{
uint8_t v_res_7_; lean_object* v_r_8_; 
v_res_7_ = lp_algalVerification_Algal_Core_Accounting_instDecidableEqCost_decEq(v_x_5_, v_x_6_);
lean_dec(v_x_6_);
lean_dec(v_x_5_);
v_r_8_ = lean_box(v_res_7_);
return v_r_8_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Accounting_instDecidableEqCost(lean_object* v_x_9_, lean_object* v_x_10_){
_start:
{
uint8_t v___x_11_; 
v___x_11_ = lean_nat_dec_eq(v_x_9_, v_x_10_);
return v___x_11_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_instDecidableEqCost___boxed(lean_object* v_x_12_, lean_object* v_x_13_){
_start:
{
uint8_t v_res_14_; lean_object* v_r_15_; 
v_res_14_ = lp_algalVerification_Algal_Core_Accounting_instDecidableEqCost(v_x_12_, v_x_13_);
lean_dec(v_x_13_);
lean_dec(v_x_12_);
v_r_15_ = lean_box(v_res_14_);
return v_r_15_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_Accounting_admitCost___closed__0(void){
_start:
{
lean_object* v___x_16_; lean_object* v___x_17_; 
v___x_16_ = lean_unsigned_to_nat(0u);
v___x_17_ = lean_nat_to_int(v___x_16_);
return v___x_17_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_Accounting_admitCost___closed__1(void){
_start:
{
lean_object* v___x_18_; lean_object* v___x_19_; 
v___x_18_ = lean_cstr_to_nat("9007199254740991");
v___x_19_ = lean_nat_to_int(v___x_18_);
return v___x_19_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_admitCost(lean_object* v_units_20_){
_start:
{
lean_object* v___x_21_; uint8_t v___x_22_; 
v___x_21_ = lean_obj_once(&lp_algalVerification_Algal_Core_Accounting_admitCost___closed__0, &lp_algalVerification_Algal_Core_Accounting_admitCost___closed__0_once, _init_lp_algalVerification_Algal_Core_Accounting_admitCost___closed__0);
v___x_22_ = lean_int_dec_le(v___x_21_, v_units_20_);
if (v___x_22_ == 0)
{
lean_object* v___x_23_; 
v___x_23_ = lean_box(0);
return v___x_23_;
}
else
{
lean_object* v___x_24_; uint8_t v___x_25_; 
v___x_24_ = lean_obj_once(&lp_algalVerification_Algal_Core_Accounting_admitCost___closed__1, &lp_algalVerification_Algal_Core_Accounting_admitCost___closed__1_once, _init_lp_algalVerification_Algal_Core_Accounting_admitCost___closed__1);
v___x_25_ = lean_int_dec_le(v_units_20_, v___x_24_);
if (v___x_25_ == 0)
{
lean_object* v___x_26_; 
v___x_26_ = lean_box(0);
return v___x_26_;
}
else
{
lean_object* v___x_27_; lean_object* v___x_28_; 
v___x_27_ = l_Int_toNat(v_units_20_);
v___x_28_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_28_, 0, v___x_27_);
return v___x_28_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_admitCost___boxed(lean_object* v_units_29_){
_start:
{
lean_object* v_res_30_; 
v_res_30_ = lp_algalVerification_Algal_Core_Accounting_admitCost(v_units_29_);
lean_dec(v_units_29_);
return v_res_30_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_BudgetError_ofNat(lean_object* v_n_31_){
_start:
{
lean_object* v___x_32_; 
v___x_32_ = lean_box(0);
return v___x_32_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_BudgetError_ofNat___boxed(lean_object* v_n_33_){
_start:
{
lean_object* v_res_34_; 
v_res_34_ = lp_algalVerification_Algal_Core_Accounting_BudgetError_ofNat(v_n_33_);
lean_dec(v_n_33_);
return v_res_34_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Accounting_instDecidableEqBudgetError(lean_object* v_x_35_, lean_object* v_y_36_){
_start:
{
uint8_t v___x_37_; 
v___x_37_ = 1;
return v___x_37_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_instDecidableEqBudgetError___boxed(lean_object* v_x_38_, lean_object* v_y_39_){
_start:
{
uint8_t v_res_40_; lean_object* v_r_41_; 
v_res_40_ = lp_algalVerification_Algal_Core_Accounting_instDecidableEqBudgetError(v_x_38_, v_y_39_);
v_r_41_ = lean_box(v_res_40_);
return v_r_41_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_preIncrement(lean_object* v_spent_44_, lean_object* v_limit_45_){
_start:
{
lean_object* v___x_46_; lean_object* v___x_47_; uint8_t v___x_48_; 
v___x_46_ = lean_unsigned_to_nat(1u);
v___x_47_ = lean_nat_add(v_spent_44_, v___x_46_);
v___x_48_ = lean_nat_dec_le(v___x_47_, v_limit_45_);
if (v___x_48_ == 0)
{
lean_object* v___x_49_; 
lean_dec(v___x_47_);
v___x_49_ = ((lean_object*)(lp_algalVerification_Algal_Core_Accounting_preIncrement___closed__0));
return v___x_49_;
}
else
{
lean_object* v___x_50_; 
v___x_50_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_50_, 0, v___x_47_);
return v___x_50_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_preIncrement___boxed(lean_object* v_spent_51_, lean_object* v_limit_52_){
_start:
{
lean_object* v_res_53_; 
v_res_53_ = lp_algalVerification_Algal_Core_Accounting_preIncrement(v_spent_51_, v_limit_52_);
lean_dec(v_limit_52_);
lean_dec(v_spent_51_);
return v_res_53_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Accounting_instDecidableEqChargeResult_decEq(lean_object* v_x_54_, lean_object* v_x_55_){
_start:
{
lean_object* v_spent_56_; uint8_t v_exhausted_57_; lean_object* v_spent_58_; uint8_t v_exhausted_59_; uint8_t v___x_60_; 
v_spent_56_ = lean_ctor_get(v_x_54_, 0);
v_exhausted_57_ = lean_ctor_get_uint8(v_x_54_, sizeof(void*)*1);
v_spent_58_ = lean_ctor_get(v_x_55_, 0);
v_exhausted_59_ = lean_ctor_get_uint8(v_x_55_, sizeof(void*)*1);
v___x_60_ = lean_nat_dec_eq(v_spent_56_, v_spent_58_);
if (v___x_60_ == 0)
{
return v___x_60_;
}
else
{
if (v_exhausted_57_ == 0)
{
if (v_exhausted_59_ == 0)
{
return v___x_60_;
}
else
{
return v_exhausted_57_;
}
}
else
{
return v_exhausted_59_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_instDecidableEqChargeResult_decEq___boxed(lean_object* v_x_61_, lean_object* v_x_62_){
_start:
{
uint8_t v_res_63_; lean_object* v_r_64_; 
v_res_63_ = lp_algalVerification_Algal_Core_Accounting_instDecidableEqChargeResult_decEq(v_x_61_, v_x_62_);
lean_dec_ref(v_x_62_);
lean_dec_ref(v_x_61_);
v_r_64_ = lean_box(v_res_63_);
return v_r_64_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Accounting_instDecidableEqChargeResult(lean_object* v_x_65_, lean_object* v_x_66_){
_start:
{
uint8_t v___x_67_; 
v___x_67_ = lp_algalVerification_Algal_Core_Accounting_instDecidableEqChargeResult_decEq(v_x_65_, v_x_66_);
return v___x_67_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_instDecidableEqChargeResult___boxed(lean_object* v_x_68_, lean_object* v_x_69_){
_start:
{
uint8_t v_res_70_; lean_object* v_r_71_; 
v_res_70_ = lp_algalVerification_Algal_Core_Accounting_instDecidableEqChargeResult(v_x_68_, v_x_69_);
lean_dec_ref(v_x_69_);
lean_dec_ref(v_x_68_);
v_r_71_ = lean_box(v_res_70_);
return v_r_71_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_postCharge(lean_object* v_spent_72_, lean_object* v_charge_73_, lean_object* v_limit_74_){
_start:
{
lean_object* v___x_75_; uint8_t v___x_76_; lean_object* v___x_77_; 
v___x_75_ = lean_nat_add(v_spent_72_, v_charge_73_);
v___x_76_ = lean_nat_dec_lt(v_limit_74_, v___x_75_);
v___x_77_ = lean_alloc_ctor(0, 1, 1);
lean_ctor_set(v___x_77_, 0, v___x_75_);
lean_ctor_set_uint8(v___x_77_, sizeof(void*)*1, v___x_76_);
return v___x_77_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_postCharge___boxed(lean_object* v_spent_78_, lean_object* v_charge_79_, lean_object* v_limit_80_){
_start:
{
lean_object* v_res_81_; 
v_res_81_ = lp_algalVerification_Algal_Core_Accounting_postCharge(v_spent_78_, v_charge_79_, v_limit_80_);
lean_dec(v_limit_80_);
lean_dec(v_charge_79_);
lean_dec(v_spent_78_);
return v_res_81_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_Accounting_activationCharge(void){
_start:
{
lean_object* v___x_82_; 
v___x_82_ = lean_unsigned_to_nat(100u);
return v___x_82_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_Accounting_effectBaseCharge(void){
_start:
{
lean_object* v___x_83_; 
v___x_83_ = lean_unsigned_to_nat(500u);
return v___x_83_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_chargeBeforeResult___redArg(lean_object* v_spent_84_, lean_object* v_cost_85_, lean_object* v_result_86_){
_start:
{
lean_object* v___x_87_; lean_object* v___x_88_; 
v___x_87_ = lean_nat_add(v_spent_84_, v_cost_85_);
v___x_88_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_88_, 0, v___x_87_);
lean_ctor_set(v___x_88_, 1, v_result_86_);
return v___x_88_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_chargeBeforeResult___redArg___boxed(lean_object* v_spent_89_, lean_object* v_cost_90_, lean_object* v_result_91_){
_start:
{
lean_object* v_res_92_; 
v_res_92_ = lp_algalVerification_Algal_Core_Accounting_chargeBeforeResult___redArg(v_spent_89_, v_cost_90_, v_result_91_);
lean_dec(v_cost_90_);
lean_dec(v_spent_89_);
return v_res_92_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_chargeBeforeResult(lean_object* v_00_u03b5_93_, lean_object* v_00_u03b1_94_, lean_object* v_spent_95_, lean_object* v_cost_96_, lean_object* v_result_97_){
_start:
{
lean_object* v___x_98_; 
v___x_98_ = lp_algalVerification_Algal_Core_Accounting_chargeBeforeResult___redArg(v_spent_95_, v_cost_96_, v_result_97_);
return v___x_98_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_chargeBeforeResult___boxed(lean_object* v_00_u03b5_99_, lean_object* v_00_u03b1_100_, lean_object* v_spent_101_, lean_object* v_cost_102_, lean_object* v_result_103_){
_start:
{
lean_object* v_res_104_; 
v_res_104_ = lp_algalVerification_Algal_Core_Accounting_chargeBeforeResult(v_00_u03b5_99_, v_00_u03b1_100_, v_spent_101_, v_cost_102_, v_result_103_);
lean_dec(v_cost_102_);
lean_dec(v_spent_101_);
return v_res_104_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_directToolResultCharge___redArg(lean_object* v_cost_105_, lean_object* v_outputBytes_106_, lean_object* v_x_107_){
_start:
{
if (lean_obj_tag(v_x_107_) == 0)
{
lean_object* v___x_108_; 
v___x_108_ = lean_unsigned_to_nat(0u);
return v___x_108_;
}
else
{
lean_object* v___x_109_; 
v___x_109_ = lean_nat_add(v_cost_105_, v_outputBytes_106_);
return v___x_109_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_directToolResultCharge___redArg___boxed(lean_object* v_cost_110_, lean_object* v_outputBytes_111_, lean_object* v_x_112_){
_start:
{
lean_object* v_res_113_; 
v_res_113_ = lp_algalVerification_Algal_Core_Accounting_directToolResultCharge___redArg(v_cost_110_, v_outputBytes_111_, v_x_112_);
lean_dec_ref(v_x_112_);
lean_dec(v_outputBytes_111_);
lean_dec(v_cost_110_);
return v_res_113_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_directToolResultCharge(lean_object* v_00_u03b5_114_, lean_object* v_00_u03b1_115_, lean_object* v_cost_116_, lean_object* v_outputBytes_117_, lean_object* v_x_118_){
_start:
{
lean_object* v___x_119_; 
v___x_119_ = lp_algalVerification_Algal_Core_Accounting_directToolResultCharge___redArg(v_cost_116_, v_outputBytes_117_, v_x_118_);
return v___x_119_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_directToolResultCharge___boxed(lean_object* v_00_u03b5_120_, lean_object* v_00_u03b1_121_, lean_object* v_cost_122_, lean_object* v_outputBytes_123_, lean_object* v_x_124_){
_start:
{
lean_object* v_res_125_; 
v_res_125_ = lp_algalVerification_Algal_Core_Accounting_directToolResultCharge(v_00_u03b5_120_, v_00_u03b1_121_, v_cost_122_, v_outputBytes_123_, v_x_124_);
lean_dec_ref(v_x_124_);
lean_dec(v_outputBytes_123_);
lean_dec(v_cost_122_);
return v_res_125_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_effectAttemptCharge(lean_object* v_contextBytes_126_){
_start:
{
lean_object* v___x_127_; lean_object* v___x_128_; 
v___x_127_ = lean_unsigned_to_nat(500u);
v___x_128_ = lean_nat_add(v___x_127_, v_contextBytes_126_);
return v___x_128_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Accounting_effectAttemptCharge___boxed(lean_object* v_contextBytes_129_){
_start:
{
lean_object* v_res_130_; 
v_res_130_ = lp_algalVerification_Algal_Core_Accounting_effectAttemptCharge(v_contextBytes_129_);
lean_dec(v_contextBytes_129_);
return v_res_130_;
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_Binary64(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Core_Accounting(uint8_t builtin) {
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
res = initialize_algalVerification_Algal_Core_Binary64(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
lp_algalVerification_Algal_Core_Accounting_maximumExactInteger = _init_lp_algalVerification_Algal_Core_Accounting_maximumExactInteger();
lean_mark_persistent(lp_algalVerification_Algal_Core_Accounting_maximumExactInteger);
lp_algalVerification_Algal_Core_Accounting_activationCharge = _init_lp_algalVerification_Algal_Core_Accounting_activationCharge();
lean_mark_persistent(lp_algalVerification_Algal_Core_Accounting_activationCharge);
lp_algalVerification_Algal_Core_Accounting_effectBaseCharge = _init_lp_algalVerification_Algal_Core_Accounting_effectBaseCharge();
lean_mark_persistent(lp_algalVerification_Algal_Core_Accounting_effectBaseCharge);
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
