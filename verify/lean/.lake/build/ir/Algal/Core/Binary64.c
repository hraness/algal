// Lean compiler output
// Module: Algal.Core.Binary64
// Imports: public import Init public meta import Init public import Init public import Init.Data.Float
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
lean_object* lean_uint64_to_nat(uint64_t);
lean_object* lean_nat_shiftr(lean_object*, lean_object*);
lean_object* lean_nat_mod(lean_object*, lean_object*);
uint8_t lean_nat_dec_lt(lean_object*, lean_object*);
uint8_t lean_uint64_dec_eq(uint64_t, uint64_t);
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_Binary64_negativeZero;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Binary64_exponent(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Binary64_exponent___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Binary64_instDecidableFinite___aux__1(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Binary64_instDecidableFinite___aux__1___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Binary64_instDecidableFinite(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Binary64_instDecidableFinite___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Binary64_instDecidableEqNumber_decEq(uint64_t, uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Binary64_instDecidableEqNumber_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Binary64_instDecidableEqNumber(uint64_t, uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Binary64_instDecidableEqNumber___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Binary64_admit(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Binary64_admit___boxed(lean_object*);
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_Binary64_normalizeBits(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Binary64_normalizeBits___boxed(lean_object*);
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_Binary64_normalize(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Binary64_normalize___boxed(lean_object*);
static uint64_t _init_lp_algalVerification_Algal_Core_Binary64_negativeZero(void){
_start:
{
uint64_t v___x_1_; 
v___x_1_ = 9223372036854775808ULL;
return v___x_1_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Binary64_exponent(uint64_t v_bits_2_){
_start:
{
lean_object* v___x_3_; lean_object* v___x_4_; lean_object* v___x_5_; lean_object* v___x_6_; lean_object* v___x_7_; 
v___x_3_ = lean_uint64_to_nat(v_bits_2_);
v___x_4_ = lean_unsigned_to_nat(52u);
v___x_5_ = lean_nat_shiftr(v___x_3_, v___x_4_);
lean_dec(v___x_3_);
v___x_6_ = lean_unsigned_to_nat(2048u);
v___x_7_ = lean_nat_mod(v___x_5_, v___x_6_);
lean_dec(v___x_5_);
return v___x_7_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Binary64_exponent___boxed(lean_object* v_bits_8_){
_start:
{
uint64_t v_bits_boxed_9_; lean_object* v_res_10_; 
v_bits_boxed_9_ = lean_unbox_uint64(v_bits_8_);
lean_dec_ref(v_bits_8_);
v_res_10_ = lp_algalVerification_Algal_Core_Binary64_exponent(v_bits_boxed_9_);
return v_res_10_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Binary64_instDecidableFinite___aux__1(uint64_t v_bits_11_){
_start:
{
lean_object* v___x_12_; lean_object* v___x_13_; uint8_t v___x_14_; 
v___x_12_ = lp_algalVerification_Algal_Core_Binary64_exponent(v_bits_11_);
v___x_13_ = lean_unsigned_to_nat(2047u);
v___x_14_ = lean_nat_dec_lt(v___x_12_, v___x_13_);
lean_dec(v___x_12_);
return v___x_14_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Binary64_instDecidableFinite___aux__1___boxed(lean_object* v_bits_15_){
_start:
{
uint64_t v_bits_boxed_16_; uint8_t v_res_17_; lean_object* v_r_18_; 
v_bits_boxed_16_ = lean_unbox_uint64(v_bits_15_);
lean_dec_ref(v_bits_15_);
v_res_17_ = lp_algalVerification_Algal_Core_Binary64_instDecidableFinite___aux__1(v_bits_boxed_16_);
v_r_18_ = lean_box(v_res_17_);
return v_r_18_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Binary64_instDecidableFinite(uint64_t v_bits_19_){
_start:
{
uint8_t v___x_20_; 
v___x_20_ = lp_algalVerification_Algal_Core_Binary64_instDecidableFinite___aux__1(v_bits_19_);
return v___x_20_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Binary64_instDecidableFinite___boxed(lean_object* v_bits_21_){
_start:
{
uint64_t v_bits_boxed_22_; uint8_t v_res_23_; lean_object* v_r_24_; 
v_bits_boxed_22_ = lean_unbox_uint64(v_bits_21_);
lean_dec_ref(v_bits_21_);
v_res_23_ = lp_algalVerification_Algal_Core_Binary64_instDecidableFinite(v_bits_boxed_22_);
v_r_24_ = lean_box(v_res_23_);
return v_r_24_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Binary64_instDecidableEqNumber_decEq(uint64_t v_x_25_, uint64_t v_x_26_){
_start:
{
uint8_t v___x_27_; 
v___x_27_ = lean_uint64_dec_eq(v_x_25_, v_x_26_);
return v___x_27_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Binary64_instDecidableEqNumber_decEq___boxed(lean_object* v_x_28_, lean_object* v_x_29_){
_start:
{
uint64_t v_x_33__boxed_30_; uint64_t v_x_34__boxed_31_; uint8_t v_res_32_; lean_object* v_r_33_; 
v_x_33__boxed_30_ = lean_unbox_uint64(v_x_28_);
lean_dec_ref(v_x_28_);
v_x_34__boxed_31_ = lean_unbox_uint64(v_x_29_);
lean_dec_ref(v_x_29_);
v_res_32_ = lp_algalVerification_Algal_Core_Binary64_instDecidableEqNumber_decEq(v_x_33__boxed_30_, v_x_34__boxed_31_);
v_r_33_ = lean_box(v_res_32_);
return v_r_33_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Binary64_instDecidableEqNumber(uint64_t v_x_34_, uint64_t v_x_35_){
_start:
{
uint8_t v___x_36_; 
v___x_36_ = lean_uint64_dec_eq(v_x_34_, v_x_35_);
return v___x_36_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Binary64_instDecidableEqNumber___boxed(lean_object* v_x_37_, lean_object* v_x_38_){
_start:
{
uint64_t v_x_6__boxed_39_; uint64_t v_x_7__boxed_40_; uint8_t v_res_41_; lean_object* v_r_42_; 
v_x_6__boxed_39_ = lean_unbox_uint64(v_x_37_);
lean_dec_ref(v_x_37_);
v_x_7__boxed_40_ = lean_unbox_uint64(v_x_38_);
lean_dec_ref(v_x_38_);
v_res_41_ = lp_algalVerification_Algal_Core_Binary64_instDecidableEqNumber(v_x_6__boxed_39_, v_x_7__boxed_40_);
v_r_42_ = lean_box(v_res_41_);
return v_r_42_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Binary64_admit(uint64_t v_bits_43_){
_start:
{
uint8_t v___x_44_; 
v___x_44_ = lp_algalVerification_Algal_Core_Binary64_instDecidableFinite___aux__1(v_bits_43_);
if (v___x_44_ == 0)
{
lean_object* v___x_45_; 
v___x_45_ = lean_box(0);
return v___x_45_;
}
else
{
lean_object* v___x_46_; lean_object* v___x_47_; 
v___x_46_ = lean_box_uint64(v_bits_43_);
v___x_47_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_47_, 0, v___x_46_);
return v___x_47_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Binary64_admit___boxed(lean_object* v_bits_48_){
_start:
{
uint64_t v_bits_boxed_49_; lean_object* v_res_50_; 
v_bits_boxed_49_ = lean_unbox_uint64(v_bits_48_);
lean_dec_ref(v_bits_48_);
v_res_50_ = lp_algalVerification_Algal_Core_Binary64_admit(v_bits_boxed_49_);
return v_res_50_;
}
}
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_Binary64_normalizeBits(uint64_t v_bits_51_){
_start:
{
uint64_t v___x_52_; uint8_t v___x_53_; 
v___x_52_ = 9223372036854775808ULL;
v___x_53_ = lean_uint64_dec_eq(v_bits_51_, v___x_52_);
if (v___x_53_ == 0)
{
return v_bits_51_;
}
else
{
uint64_t v___x_54_; 
v___x_54_ = 0ULL;
return v___x_54_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Binary64_normalizeBits___boxed(lean_object* v_bits_55_){
_start:
{
uint64_t v_bits_boxed_56_; uint64_t v_res_57_; lean_object* v_r_58_; 
v_bits_boxed_56_ = lean_unbox_uint64(v_bits_55_);
lean_dec_ref(v_bits_55_);
v_res_57_ = lp_algalVerification_Algal_Core_Binary64_normalizeBits(v_bits_boxed_56_);
v_r_58_ = lean_box_uint64(v_res_57_);
return v_r_58_;
}
}
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_Binary64_normalize(uint64_t v_number_59_){
_start:
{
uint64_t v___x_60_; 
v___x_60_ = lp_algalVerification_Algal_Core_Binary64_normalizeBits(v_number_59_);
return v___x_60_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Binary64_normalize___boxed(lean_object* v_number_61_){
_start:
{
uint64_t v_number_boxed_62_; uint64_t v_res_63_; lean_object* v_r_64_; 
v_number_boxed_62_ = lean_unbox_uint64(v_number_61_);
lean_dec_ref(v_number_61_);
v_res_63_ = lp_algalVerification_Algal_Core_Binary64_normalize(v_number_boxed_62_);
v_r_64_ = lean_box_uint64(v_res_63_);
return v_r_64_;
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init_Data_Float(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Core_Binary64(uint8_t builtin) {
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
res = initialize_Init(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_Init_Data_Float(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
lp_algalVerification_Algal_Core_Binary64_negativeZero = _init_lp_algalVerification_Algal_Core_Binary64_negativeZero();
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
