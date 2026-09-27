// Lean compiler output
// Module: Algal.Core.RationalBracket
// Imports: public import Init public meta import Init public import Algal.Core.FiniteNeighbors public import Algal.Core.IntervalSearch
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
uint8_t lean_nat_dec_le(lean_object*, lean_object*);
uint64_t lean_uint64_of_nat(lean_object*);
lean_object* lp_algalVerification_Algal_Core_RoundingInterval_value(uint64_t);
uint8_t l_Rat_instDecidableLe(lean_object*, lean_object*);
lean_object* lp_algalVerification_Algal_Core_IntervalSearch_cut(lean_object*, lean_object*, lean_object*);
lean_object* lean_nat_sub(lean_object*, lean_object*);
lean_object* lp_algalVerification_Algal_Core_IntervalSearch_search(lean_object*, lean_object*, lean_object*);
uint8_t lean_nat_dec_lt(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RationalBracket_domain;
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_RationalBracket_atCode(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RationalBracket_atCode___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RationalBracket_codeValue(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RationalBracket_codeValue___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_RationalBracket_below(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RationalBracket_below___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RationalBracket_first(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RationalBracket_lowerCode(lean_object*);
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_RationalBracket_lowerNumber(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RationalBracket_lowerNumber___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RationalBracket_bracket(lean_object*);
static lean_object* _init_lp_algalVerification_Algal_Core_RationalBracket_domain(void){
_start:
{
lean_object* v___x_1_; 
v___x_1_ = lean_cstr_to_nat("9218868437227405312");
return v___x_1_;
}
}
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_RationalBracket_atCode(lean_object* v_code_2_){
_start:
{
lean_object* v___x_3_; uint8_t v___x_4_; 
v___x_3_ = lean_cstr_to_nat("9218868437227405311");
v___x_4_ = lean_nat_dec_le(v_code_2_, v___x_3_);
if (v___x_4_ == 0)
{
uint64_t v___x_5_; 
v___x_5_ = 9218868437227405311ULL;
return v___x_5_;
}
else
{
uint64_t v___x_6_; 
v___x_6_ = lean_uint64_of_nat(v_code_2_);
return v___x_6_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RationalBracket_atCode___boxed(lean_object* v_code_7_){
_start:
{
uint64_t v_res_8_; lean_object* v_r_9_; 
v_res_8_ = lp_algalVerification_Algal_Core_RationalBracket_atCode(v_code_7_);
lean_dec(v_code_7_);
v_r_9_ = lean_box_uint64(v_res_8_);
return v_r_9_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RationalBracket_codeValue(lean_object* v_code_10_){
_start:
{
uint64_t v___x_11_; lean_object* v___x_12_; 
v___x_11_ = lp_algalVerification_Algal_Core_RationalBracket_atCode(v_code_10_);
v___x_12_ = lp_algalVerification_Algal_Core_RoundingInterval_value(v___x_11_);
return v___x_12_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RationalBracket_codeValue___boxed(lean_object* v_code_13_){
_start:
{
lean_object* v_res_14_; 
v_res_14_ = lp_algalVerification_Algal_Core_RationalBracket_codeValue(v_code_13_);
lean_dec(v_code_13_);
return v_res_14_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_RationalBracket_below(lean_object* v_x_15_, lean_object* v_code_16_){
_start:
{
lean_object* v___x_17_; uint8_t v___x_18_; 
v___x_17_ = lp_algalVerification_Algal_Core_RationalBracket_codeValue(v_code_16_);
v___x_18_ = l_Rat_instDecidableLe(v___x_17_, v_x_15_);
return v___x_18_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RationalBracket_below___boxed(lean_object* v_x_19_, lean_object* v_code_20_){
_start:
{
uint8_t v_res_21_; lean_object* v_r_22_; 
v_res_21_ = lp_algalVerification_Algal_Core_RationalBracket_below(v_x_19_, v_code_20_);
lean_dec(v_code_20_);
v_r_22_ = lean_box(v_res_21_);
return v_r_22_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RationalBracket_first(lean_object* v_x_23_){
_start:
{
lean_object* v___x_24_; lean_object* v___x_25_; lean_object* v___x_26_; lean_object* v___x_27_; 
v___x_24_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Core_RationalBracket_below___boxed), 2, 1);
lean_closure_set(v___x_24_, 0, v_x_23_);
v___x_25_ = lean_unsigned_to_nat(0u);
v___x_26_ = lean_cstr_to_nat("9218868437227405312");
v___x_27_ = lp_algalVerification_Algal_Core_IntervalSearch_cut(v___x_24_, v___x_25_, v___x_26_);
return v___x_27_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RationalBracket_lowerCode(lean_object* v_x_28_){
_start:
{
lean_object* v___x_29_; lean_object* v___x_30_; lean_object* v___x_31_; 
v___x_29_ = lp_algalVerification_Algal_Core_RationalBracket_first(v_x_28_);
v___x_30_ = lean_unsigned_to_nat(1u);
v___x_31_ = lean_nat_sub(v___x_29_, v___x_30_);
lean_dec(v___x_29_);
return v___x_31_;
}
}
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_RationalBracket_lowerNumber(lean_object* v_x_32_){
_start:
{
lean_object* v___x_33_; uint64_t v___x_34_; 
v___x_33_ = lp_algalVerification_Algal_Core_RationalBracket_lowerCode(v_x_32_);
v___x_34_ = lp_algalVerification_Algal_Core_RationalBracket_atCode(v___x_33_);
lean_dec(v___x_33_);
return v___x_34_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RationalBracket_lowerNumber___boxed(lean_object* v_x_35_){
_start:
{
uint64_t v_res_36_; lean_object* v_r_37_; 
v_res_36_ = lp_algalVerification_Algal_Core_RationalBracket_lowerNumber(v_x_35_);
v_r_37_ = lean_box_uint64(v_res_36_);
return v_r_37_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RationalBracket_bracket(lean_object* v_x_38_){
_start:
{
lean_object* v___x_39_; lean_object* v___x_40_; lean_object* v___x_41_; lean_object* v_result_42_; lean_object* v_fst_43_; lean_object* v_snd_44_; lean_object* v___x_45_; lean_object* v___x_46_; uint64_t v___x_47_; uint8_t v___x_48_; 
v___x_39_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Core_RationalBracket_below___boxed), 2, 1);
lean_closure_set(v___x_39_, 0, v_x_38_);
v___x_40_ = lean_unsigned_to_nat(0u);
v___x_41_ = lean_cstr_to_nat("9218868437227405312");
v_result_42_ = lp_algalVerification_Algal_Core_IntervalSearch_search(v___x_39_, v___x_40_, v___x_41_);
v_fst_43_ = lean_ctor_get(v_result_42_, 0);
lean_inc(v_fst_43_);
v_snd_44_ = lean_ctor_get(v_result_42_, 1);
lean_inc(v_snd_44_);
lean_dec_ref(v_result_42_);
v___x_45_ = lean_unsigned_to_nat(1u);
v___x_46_ = lean_nat_sub(v_fst_43_, v___x_45_);
v___x_47_ = lp_algalVerification_Algal_Core_RationalBracket_atCode(v___x_46_);
lean_dec(v___x_46_);
v___x_48_ = lean_nat_dec_lt(v_fst_43_, v___x_41_);
if (v___x_48_ == 0)
{
lean_object* v___x_49_; lean_object* v___x_50_; 
lean_dec(v_fst_43_);
v___x_49_ = lean_box(0);
v___x_50_ = lean_alloc_ctor(0, 2, 8);
lean_ctor_set(v___x_50_, 0, v___x_49_);
lean_ctor_set(v___x_50_, 1, v_snd_44_);
lean_ctor_set_uint64(v___x_50_, sizeof(void*)*2, v___x_47_);
return v___x_50_;
}
else
{
uint64_t v___x_51_; lean_object* v___x_52_; lean_object* v___x_53_; lean_object* v___x_54_; 
v___x_51_ = lp_algalVerification_Algal_Core_RationalBracket_atCode(v_fst_43_);
lean_dec(v_fst_43_);
v___x_52_ = lean_box_uint64(v___x_51_);
v___x_53_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_53_, 0, v___x_52_);
v___x_54_ = lean_alloc_ctor(0, 2, 8);
lean_ctor_set(v___x_54_, 0, v___x_53_);
lean_ctor_set(v___x_54_, 1, v_snd_44_);
lean_ctor_set_uint64(v___x_54_, sizeof(void*)*2, v___x_47_);
return v___x_54_;
}
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_FiniteNeighbors(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_IntervalSearch(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Core_RationalBracket(uint8_t builtin) {
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
res = initialize_algalVerification_Algal_Core_FiniteNeighbors(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_IntervalSearch(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
lp_algalVerification_Algal_Core_RationalBracket_domain = _init_lp_algalVerification_Algal_Core_RationalBracket_domain();
lean_mark_persistent(lp_algalVerification_Algal_Core_RationalBracket_domain);
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
