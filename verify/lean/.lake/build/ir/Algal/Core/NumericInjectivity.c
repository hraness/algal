// Lean compiler output
// Module: Algal.Core.NumericInjectivity
// Imports: public import Init public meta import Init public import Algal.Core.BinaryValue public import Init.Data.Rat.Lemmas public import Init.Omega
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
lean_object* lean_nat_sub(lean_object*, lean_object*);
lean_object* lean_nat_pow(lean_object*, lean_object*);
lean_object* lean_nat_mul(lean_object*, lean_object*);
uint8_t lean_nat_dec_eq(lean_object*, lean_object*);
lean_object* lean_nat_add(lean_object*, lean_object*);
uint8_t lp_algalVerification_Algal_Core_BinaryValue_sign(uint64_t);
lean_object* lp_algalVerification_Algal_Core_Binary64_exponent(uint64_t);
lean_object* lp_algalVerification_Algal_Core_BinaryValue_fraction(uint64_t);
lean_object* lean_nat_to_int(lean_object*);
lean_object* l_Float_Model_UnpackedFloat_Sign_apply(uint8_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_NumericInjectivity_base;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_NumericInjectivity_units(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_NumericInjectivity_units___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_NumericInjectivity_bitUnits(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_NumericInjectivity_bitUnits___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_NumericInjectivity_signedUnits(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_NumericInjectivity_signedUnits___boxed(lean_object*);
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_NumericInjectivity_positiveZero;
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_NumericInjectivity_negativeZero;
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_NumericInjectivity_one;
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_NumericInjectivity_two;
static lean_object* _init_lp_algalVerification_Algal_Core_NumericInjectivity_base(void){
_start:
{
lean_object* v___x_1_; 
v___x_1_ = lean_cstr_to_nat("4503599627370496");
return v___x_1_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_NumericInjectivity_units(lean_object* v_e_2_, lean_object* v_f_3_){
_start:
{
lean_object* v___y_5_; lean_object* v___x_11_; uint8_t v___x_12_; 
v___x_11_ = lean_unsigned_to_nat(0u);
v___x_12_ = lean_nat_dec_eq(v_e_2_, v___x_11_);
if (v___x_12_ == 0)
{
lean_object* v___x_13_; lean_object* v___x_14_; 
v___x_13_ = lean_cstr_to_nat("4503599627370496");
v___x_14_ = lean_nat_add(v___x_13_, v_f_3_);
lean_dec(v_f_3_);
v___y_5_ = v___x_14_;
goto v___jp_4_;
}
else
{
v___y_5_ = v_f_3_;
goto v___jp_4_;
}
v___jp_4_:
{
lean_object* v___x_6_; lean_object* v___x_7_; lean_object* v___x_8_; lean_object* v___x_9_; lean_object* v___x_10_; 
v___x_6_ = lean_unsigned_to_nat(2u);
v___x_7_ = lean_unsigned_to_nat(1u);
v___x_8_ = lean_nat_sub(v_e_2_, v___x_7_);
v___x_9_ = lean_nat_pow(v___x_6_, v___x_8_);
lean_dec(v___x_8_);
v___x_10_ = lean_nat_mul(v___y_5_, v___x_9_);
lean_dec(v___x_9_);
lean_dec(v___y_5_);
return v___x_10_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_NumericInjectivity_units___boxed(lean_object* v_e_15_, lean_object* v_f_16_){
_start:
{
lean_object* v_res_17_; 
v_res_17_ = lp_algalVerification_Algal_Core_NumericInjectivity_units(v_e_15_, v_f_16_);
lean_dec(v_e_15_);
return v_res_17_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_NumericInjectivity_bitUnits(uint64_t v_bits_18_){
_start:
{
lean_object* v___x_19_; lean_object* v___x_20_; lean_object* v___x_21_; 
v___x_19_ = lp_algalVerification_Algal_Core_Binary64_exponent(v_bits_18_);
v___x_20_ = lp_algalVerification_Algal_Core_BinaryValue_fraction(v_bits_18_);
v___x_21_ = lp_algalVerification_Algal_Core_NumericInjectivity_units(v___x_19_, v___x_20_);
lean_dec(v___x_19_);
return v___x_21_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_NumericInjectivity_bitUnits___boxed(lean_object* v_bits_22_){
_start:
{
uint64_t v_bits_boxed_23_; lean_object* v_res_24_; 
v_bits_boxed_23_ = lean_unbox_uint64(v_bits_22_);
lean_dec_ref(v_bits_22_);
v_res_24_ = lp_algalVerification_Algal_Core_NumericInjectivity_bitUnits(v_bits_boxed_23_);
return v_res_24_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_NumericInjectivity_signedUnits(uint64_t v_bits_25_){
_start:
{
uint8_t v___x_26_; lean_object* v___x_27_; lean_object* v___x_28_; lean_object* v___x_29_; 
v___x_26_ = lp_algalVerification_Algal_Core_BinaryValue_sign(v_bits_25_);
v___x_27_ = lp_algalVerification_Algal_Core_NumericInjectivity_bitUnits(v_bits_25_);
v___x_28_ = lean_nat_to_int(v___x_27_);
v___x_29_ = l_Float_Model_UnpackedFloat_Sign_apply(v___x_26_, v___x_28_);
lean_dec(v___x_28_);
return v___x_29_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_NumericInjectivity_signedUnits___boxed(lean_object* v_bits_30_){
_start:
{
uint64_t v_bits_boxed_31_; lean_object* v_res_32_; 
v_bits_boxed_31_ = lean_unbox_uint64(v_bits_30_);
lean_dec_ref(v_bits_30_);
v_res_32_ = lp_algalVerification_Algal_Core_NumericInjectivity_signedUnits(v_bits_boxed_31_);
return v_res_32_;
}
}
static uint64_t _init_lp_algalVerification_Algal_Core_NumericInjectivity_positiveZero(void){
_start:
{
uint64_t v___x_33_; 
v___x_33_ = 0ULL;
return v___x_33_;
}
}
static uint64_t _init_lp_algalVerification_Algal_Core_NumericInjectivity_negativeZero(void){
_start:
{
uint64_t v___x_34_; 
v___x_34_ = 9223372036854775808ULL;
return v___x_34_;
}
}
static uint64_t _init_lp_algalVerification_Algal_Core_NumericInjectivity_one(void){
_start:
{
uint64_t v___x_35_; 
v___x_35_ = 4607182418800017408ULL;
return v___x_35_;
}
}
static uint64_t _init_lp_algalVerification_Algal_Core_NumericInjectivity_two(void){
_start:
{
uint64_t v___x_36_; 
v___x_36_ = 4611686018427387904ULL;
return v___x_36_;
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_BinaryValue(uint8_t builtin);
lean_object* initialize_Init_Data_Rat_Lemmas(uint8_t builtin);
lean_object* initialize_Init_Omega(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Core_NumericInjectivity(uint8_t builtin) {
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
res = initialize_algalVerification_Algal_Core_BinaryValue(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_Init_Data_Rat_Lemmas(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_Init_Omega(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
lp_algalVerification_Algal_Core_NumericInjectivity_base = _init_lp_algalVerification_Algal_Core_NumericInjectivity_base();
lean_mark_persistent(lp_algalVerification_Algal_Core_NumericInjectivity_base);
lp_algalVerification_Algal_Core_NumericInjectivity_positiveZero = _init_lp_algalVerification_Algal_Core_NumericInjectivity_positiveZero();
lp_algalVerification_Algal_Core_NumericInjectivity_negativeZero = _init_lp_algalVerification_Algal_Core_NumericInjectivity_negativeZero();
lp_algalVerification_Algal_Core_NumericInjectivity_one = _init_lp_algalVerification_Algal_Core_NumericInjectivity_one();
lp_algalVerification_Algal_Core_NumericInjectivity_two = _init_lp_algalVerification_Algal_Core_NumericInjectivity_two();
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
